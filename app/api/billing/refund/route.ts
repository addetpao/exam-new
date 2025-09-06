import { NextRequest } from "next/server";
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
  handleAPIError,
} from "@/lib/server/utils/api-response";
import { requireAuth } from "@/lib/auth/guard";
import {
  checkRefundEligibility,
  processRefund,
  getRefundHistory,
} from "@/lib/stripe";

// Request validation schema
const refundRequestSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z
    .string()
    .min(1, "Refund reason is required")
    .max(500, "Reason too long"),
});

const refundCheckSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

/**
 * POST /api/billing/refund - Process refund for a user (admin only)
 */
export async function POST(request: NextRequest) {
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

    // Check admin permissions
    if (authResult.user.user_metadata?.app_role !== "admin") {
      return createErrorResponse(
        "FORBIDDEN",
        "Admin privileges required",
        null,
        403
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = refundRequestSchema.safeParse(body);

    if (!validation.success) {
      return createErrorResponse(
        "BAD_REQUEST",
        "Invalid request data",
        validation.error.errors,
        400
      );
    }

    const { userId, reason } = validation.data;

    // Process the refund
    const result = await processRefund(userId, authResult.user.id, reason);

    if (!result.success) {
      return createErrorResponse("BAD_REQUEST", result.error!, null, 400);
    }

    return createSuccessResponse({
      success: true,
      refundId: result.refundId,
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    return handleAPIError(error);
  }
}

/**
 * GET /api/billing/refund?userId=xxx - Check refund eligibility or get refund history
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

    // Check admin permissions
    if (authResult.user.user_metadata?.app_role !== "admin") {
      return createErrorResponse(
        "FORBIDDEN",
        "Admin privileges required",
        null,
        403
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action") || "eligibility";

    if (!userId) {
      return createErrorResponse(
        "BAD_REQUEST",
        "User ID parameter is required",
        null,
        400
      );
    }

    if (action === "eligibility") {
      // Check refund eligibility
      const eligibility = await checkRefundEligibility(userId);
      return createSuccessResponse(eligibility);
    } else if (action === "history") {
      // Get refund history
      const history = await getRefundHistory(userId);
      return createSuccessResponse({ refunds: history });
    } else {
      return createErrorResponse(
        "BAD_REQUEST",
        "Invalid action parameter",
        null,
        400
      );
    }
  } catch (error) {
    console.error("Refund check error:", error);
    return handleAPIError(error);
  }
}

// Only allow GET and POST requests
export async function PUT() {
  return createErrorResponse(
    "METHOD_NOT_ALLOWED",
    "PUT method not allowed",
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
