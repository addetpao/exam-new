import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleAPIError,
} from "@/lib/server/utils/api-response";
import { requireAuth } from "@/lib/auth/guard";
import {
  getUserSubscription,
  cancelSubscription,
  resumeSubscription,
} from "@/lib/stripe";
import { getUserEntitlements } from "@/lib/server/payments";

// Request validation schema for subscription updates
const subscriptionUpdateSchema = z.object({
  action: z.enum(["cancel", "resume"]),
  cancelAtPeriodEnd: z.boolean().optional().default(true),
});

/**
 * GET /api/billing/subscription - Get user's current subscription details
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Authentication required",
        null,
        401
      );
    }

    const userId = authResult.user.id;

    // Get subscription details
    const subscription = await getUserSubscription(userId);
    const entitlements = await getUserEntitlements(userId);

    return createSuccessResponse({
      subscription: subscription
        ? {
            id: subscription.stripe_subscription_id,
            status: subscription.status,
            planKey: subscription.plan_key,
            planDays: subscription.plan_days,
            startAt: subscription.start_at,
            endAt: subscription.end_at,
            createdAt: subscription.created_at,
            updatedAt: subscription.updated_at,
          }
        : null,
      entitlements: {
        hasActiveSubscription: entitlements.hasActiveSubscription,
        selfAssessmentRemaining: entitlements.selfAssessmentRemaining,
        examAttemptsRemaining: entitlements.examAttemptsRemaining,
        subscriptionEndAt: entitlements.subscriptionEndAt,
        subscriptionStatus: entitlements.subscriptionStatus,
      },
    });
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return handleAPIError(error);
  }
}

/**
 * PUT /api/billing/subscription - Update subscription (cancel/resume)
 */
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse(
        "UNAUTHORIZED",
        "Authentication required",
        null,
        401
      );
    }

    const userId = authResult.user.id;

    // Parse and validate request body
    const body = await request.json();
    const validation = subscriptionUpdateSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        "BAD_REQUEST",
        "Invalid request data",
        validation.error.errors,
        400
      );
    }

    const { action, cancelAtPeriodEnd } = validation.data;

    // Get user's subscription
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      return createErrorResponse(
        "NOT_FOUND",
        "No active subscription found",
        null,
        404
      );
    }

    let result;
    if (action === "cancel") {
      result = await cancelSubscription(
        subscription.stripe_subscription_id,
        cancelAtPeriodEnd
      );
    } else if (action === "resume") {
      result = await resumeSubscription(subscription.stripe_subscription_id);
    }

    return createSuccessResponse({
      success: true,
      action: action,
      subscriptionId: subscription.stripe_subscription_id,
      cancelAtPeriodEnd: result?.cancel_at_period_end,
      message: `Subscription ${action} successful`,
    });
  } catch (error) {
    console.error("Subscription update error:", error);
    return handleAPIError(error);
  }
}

// Only allow GET and PUT requests
export async function POST() {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    "POST method not allowed",
    null,
    405
  );
}

export async function DELETE() {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    "DELETE method not allowed",
    null,
    405
  );
}
