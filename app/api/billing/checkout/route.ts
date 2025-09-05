import { NextRequest } from "next/server";
import { z } from "zod";
import { createSuccessResponse, createErrorResponse, handleAPIError } from "@/lib/server/utils/api-response";
import { requireAuth } from "@/lib/auth/guard";
import { createCheckoutSession, isValidPriceId } from "@/lib/stripe";

// Request validation schema
const checkoutRequestSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
  successUrl: z.string().url("Valid success URL is required"),
  cancelUrl: z.string().url("Valid cancel URL is required"),
  trialPeriodDays: z.number().min(0).max(30).optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * POST /api/billing/checkout - Create Stripe checkout session
 * Creates a checkout session for subscription purchase
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.success || !authResult.user) {
      return createErrorResponse("UNAUTHORIZED", "Authentication required", null, 401);
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = checkoutRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return createErrorResponse(
        "BAD_REQUEST", 
        "Invalid request data", 
        validation.error.errors, 
        400
      );
    }

    const { priceId, successUrl, cancelUrl, trialPeriodDays, metadata } = validation.data;

    // Validate price ID
    if (!isValidPriceId(priceId)) {
      return createErrorResponse("BAD_REQUEST", "Invalid price ID", { priceId }, 400);
    }

    // Create user profile for Stripe
    const userProfile = {
      id: authResult.user.id,
      email: authResult.user.email!,
      full_name: authResult.user.user_metadata?.full_name || null,
    };

    // Create checkout session
    const checkoutUrl = await createCheckoutSession(userProfile, {
      priceId,
      successUrl,
      cancelUrl,
      trialPeriodDays,
      metadata: {
        ...metadata,
        user_email: authResult.user.email!,
        created_at: new Date().toISOString(),
      },
    });

    return createSuccessResponse({
      checkoutUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    });

  } catch (error) {
    console.error("Checkout session creation error:", error);
    return handleAPIError(error);
  }
}

// Only allow POST requests
export async function GET() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "GET method not allowed", null, 405);
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "PUT method not allowed", null, 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "DELETE method not allowed", null, 405);
}