-- Migration: Align users schema with app code and add core tables
-- Created: 2025-09-05

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Users table alignment
DO $$ BEGIN
  -- enum for subscription status
  CREATE TYPE user_subscription_status AS ENUM ('free','trial','premium','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add missing columns used by application code
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS app_role user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS email_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status user_subscription_status NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Backfill app_role from existing role if present
UPDATE public.users SET app_role = role WHERE app_role IS NULL;

-- Add FK to auth.users(id) for identity linkage (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'users' AND constraint_name = 'users_auth_fk'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_fk
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- RLS: fix update policy to avoid using OLD; enforce sensitive fields via trigger
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to prevent non-admins from changing privileged fields
CREATE OR REPLACE FUNCTION public.prevent_privileged_user_field_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_actor_role user_role;
BEGIN
  -- Determine the role of the acting user
  SELECT app_role INTO current_actor_role FROM public.users WHERE id = auth.uid();

  IF current_actor_role IS DISTINCT FROM 'admin' THEN
    IF NEW.app_role IS DISTINCT FROM OLD.app_role THEN
      RAISE EXCEPTION 'Only admins can change app_role';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Only admins can change status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_prevent_privileged_changes ON public.users;
CREATE TRIGGER trg_users_prevent_privileged_changes
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privileged_user_field_changes();

-- Helper functions updated to use app_role
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.app_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_content_editor(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id AND u.app_role IN ('admin','content_editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Subscriptions and payments tables (used by Stripe flows)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  plan_key TEXT NOT NULL,
  plan_days INTEGER NOT NULL,
  self_assessment_remaining INTEGER NOT NULL DEFAULT 0,
  exam_attempts_remaining INTEGER NOT NULL DEFAULT 0,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_at ON public.subscriptions(end_at);

CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  stripe_charge_id TEXT,
  stripe_invoice_id TEXT,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  refunded_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data JSONB
);

-- 3) Content taxonomy and question bank
CREATE TABLE IF NOT EXISTS public.domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_objectives_domain ON public.objectives(domain_id);

CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice','pbq')),
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  difficulty TEXT CHECK (difficulty IN ('easy','medium','hard')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  explanation TEXT,
  pbq_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_questions_domain ON public.questions(domain_id);
CREATE INDEX IF NOT EXISTS idx_questions_objective ON public.questions(objective_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);

CREATE TABLE IF NOT EXISTS public.choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  explanation TEXT
);
CREATE INDEX IF NOT EXISTS idx_choices_question ON public.choices(question_id);

-- 4) Practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id) ON DELETE SET NULL,
  question_count INTEGER NOT NULL,
  correct_answers INTEGER,
  total_time INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON public.practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON public.practice_sessions(status);

CREATE TABLE IF NOT EXISTS public.practice_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_choice_id UUID REFERENCES public.choices(id) ON DELETE SET NULL,
  is_correct BOOLEAN,
  time_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_psq_session ON public.practice_session_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_psq_question ON public.practice_session_questions(question_id);

-- 5) Exam sessions
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER,
  passed BOOLEAN,
  total_questions INTEGER,
  correct_answers INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  time_limit INTEGER,
  passing_score INTEGER
);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON public.exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_sessions_type ON public.exam_sessions(exam_type);

CREATE TABLE IF NOT EXISTS public.exam_session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_esq_session ON public.exam_session_questions(session_id);

-- Note: RLS is intentionally not added for these new tables since service-role access is used
-- in server routes. Add RLS policies later as needed.

