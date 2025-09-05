import { createSupabaseAdmin } from "@/lib/server/db/supabase";
import { getUserSubscription, isSubscriptionActive } from "@/lib/stripe";

export interface UserEntitlements {
  hasActiveSubscription: boolean;
  planKey?: string;
  planDays?: number;
  selfAssessmentRemaining: number;
  examAttemptsRemaining: number;
  subscriptionEndAt?: string;
  subscriptionStatus?: string;
}

/**
 * Get user's current entitlements based on subscription
 */
export async function getUserEntitlements(userId: string): Promise<UserEntitlements> {
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    return {
      hasActiveSubscription: false,
      selfAssessmentRemaining: 0,
      examAttemptsRemaining: 0,
    };
  }

  const hasActive = isSubscriptionActive(subscription.end_at, subscription.status);

  return {
    hasActiveSubscription: hasActive,
    planKey: subscription.plan_key,
    planDays: subscription.plan_days,
    selfAssessmentRemaining: subscription.self_assessment_remaining,
    examAttemptsRemaining: subscription.exam_attempts_remaining,
    subscriptionEndAt: subscription.end_at,
    subscriptionStatus: subscription.status,
  };
}

/**
 * Check if user can take self-assessment
 */
export async function canTakeSelfAssessment(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const entitlements = await getUserEntitlements(userId);

  if (!entitlements.hasActiveSubscription) {
    return { allowed: false, reason: "No active subscription" };
  }

  if (entitlements.selfAssessmentRemaining <= 0) {
    return { 
      allowed: false, 
      reason: "No self-assessments remaining", 
      remaining: 0 
    };
  }

  return { 
    allowed: true, 
    remaining: entitlements.selfAssessmentRemaining 
  };
}

/**
 * Check if user can take practice exam
 */
export async function canTakePracticeExam(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining?: number;
}> {
  const entitlements = await getUserEntitlements(userId);

  if (!entitlements.hasActiveSubscription) {
    return { allowed: false, reason: "No active subscription" };
  }

  if (entitlements.examAttemptsRemaining <= 0) {
    return { 
      allowed: false, 
      reason: "No exam attempts remaining", 
      remaining: 0 
    };
  }

  return { 
    allowed: true, 
    remaining: entitlements.examAttemptsRemaining 
  };
}

/**
 * Consume a self-assessment attempt
 */
export async function consumeSelfAssessment(userId: string): Promise<{
  success: boolean;
  remaining?: number;
  error?: string;
}> {
  const supabase = createSupabaseAdmin();

  const canTake = await canTakeSelfAssessment(userId);
  if (!canTake.allowed) {
    return { success: false, error: canTake.reason };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      self_assessment_remaining: (canTake.remaining || 1) - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("self_assessment_remaining")
    .single();

  if (error) {
    return { success: false, error: "Failed to update subscription" };
  }

  return { 
    success: true, 
    remaining: data.self_assessment_remaining 
  };
}

/**
 * Consume a practice exam attempt
 */
export async function consumePracticeExam(userId: string): Promise<{
  success: boolean;
  remaining?: number;
  error?: string;
}> {
  const supabase = createSupabaseAdmin();

  const canTake = await canTakePracticeExam(userId);
  if (!canTake.allowed) {
    return { success: false, error: canTake.reason };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update({
      exam_attempts_remaining: (canTake.remaining || 1) - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("exam_attempts_remaining")
    .single();

  if (error) {
    return { success: false, error: "Failed to update subscription" };
  }

  return { 
    success: true, 
    remaining: data.exam_attempts_remaining 
  };
}

/**
 * Check if user has access to QBank (always true for active subscriptions)
 */
export async function hasQBankAccess(userId: string): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.hasActiveSubscription;
}

/**
 * Check if user has access to PBQ simulations
 */
export async function hasPBQAccess(userId: string): Promise<boolean> {
  const entitlements = await getUserEntitlements(userId);
  return entitlements.hasActiveSubscription;
}