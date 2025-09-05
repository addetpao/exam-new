import { z } from "zod";

// Common validation schemas
export const UUIDSchema = z.string().uuid("Invalid UUID format");

export const PaginationSchema = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Auth schemas
export const SessionResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(["user", "admin"]),
    subscription_status: z.enum(["free", "trial", "premium", "cancelled"]).nullable(),
    subscription_tier: z.enum(["basic", "premium"]).nullable(),
    trial_ends_at: z.string().datetime().nullable(),
    created_at: z.string().datetime(),
  }),
});

// Practice schemas
export const PracticeSessionCreateSchema = z.object({
  domain_id: z.string().uuid().optional(),
  objective_ids: z.array(z.string().uuid()).optional(),
  question_count: z.number().min(1).max(50).default(10),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const PracticeQuestionResponseSchema = z.object({
  selected_choice_id: z.string().uuid(),
  time_spent: z.number().min(0), // in seconds
});

// Exam schemas
export const ExamSessionCreateSchema = z.object({
  exam_type: z.enum(["1101", "1102", "combined"]),
});

export const ExamQuestionResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_choice_id: z.string().uuid().nullable(),
  pbq_response: z.record(z.any()).optional(), // For PBQ responses
  time_spent: z.number().min(0),
});

export const ExamSubmissionSchema = z.object({
  responses: z.array(ExamQuestionResponseSchema),
});

// Admin schemas
export const QuestionCreateSchema = z.object({
  domain_id: z.string().uuid(),
  objective_id: z.string().uuid(),
  question_text: z.string().min(10),
  question_type: z.enum(["multiple_choice", "pbq"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  explanation: z.string().min(10),
  choices: z.array(z.object({
    choice_text: z.string().min(1),
    is_correct: z.boolean(),
    explanation: z.string().optional(),
  })).min(2).max(6),
  pbq_config: z.record(z.any()).optional(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const QuestionUpdateSchema = QuestionCreateSchema.partial();

// Stripe webhook schemas
export const StripeWebhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number(),
});

// Health check schema
export const HealthCheckResponseSchema = z.object({
  status: z.enum(["healthy", "unhealthy"]),
  timestamp: z.string().datetime(),
  version: z.string(),
  services: z.object({
    database: z.enum(["healthy", "unhealthy"]),
    auth: z.enum(["healthy", "unhealthy"]),
    storage: z.enum(["healthy", "unhealthy"]),
  }),
  uptime: z.number(),
});