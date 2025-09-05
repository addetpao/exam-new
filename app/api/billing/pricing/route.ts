import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse } from "@/lib/server/utils/api-response";
import { STRIPE_PRICING } from "@/lib/stripe";

/**
 * GET /api/billing/pricing - Get available subscription plans
 * This endpoint is public and doesn't require authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Transform pricing config for client consumption
    const pricing = Object.entries(STRIPE_PRICING).map(([key, config]) => ({
      planKey: key,
      priceId: config.priceId,
      displayPrice: config.displayPrice,
      days: config.days,
      selfAssessments: config.selfAssessments,
      examAttempts: config.examAttempts,
      features: [
        "Unlimited QBank Practice Questions",
        "Performance-Based Questions (PBQs)",
        "Detailed Explanations & References",
        "Progress Tracking & Analytics",
        `${config.examAttempts} Practice Exam Attempts`,
        ...(config.selfAssessments > 0 ? [`${config.selfAssessments} Additional Self-Assessments`] : []),
        `${config.days}-Day Access`,
      ],
      popular: key === "90_DAY", // Mark 90-day as most popular
      recommended: key === "60_DAY", // Mark 60-day as recommended
    }));

    // Sort by days ascending
    pricing.sort((a, b) => a.days - b.days);

    return createSuccessResponse({
      plans: pricing,
      currency: "USD",
      billingPeriod: "one-time",
      trialAvailable: false,
      refundPolicy: {
        eligible: true,
        conditions: [
          "Within 7 days of purchase",
          "Less than 10% of QBank questions attempted",
        ],
        contactEmail: "support@examprep.com",
      },
    });

  } catch (error) {
    console.error("Pricing fetch error:", error);
    return createErrorResponse("INTERNAL_ERROR", "Failed to fetch pricing", null, 500);
  }
}

// Only allow GET requests
export async function POST() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "POST method not allowed", null, 405);
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "PUT method not allowed", null, 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "DELETE method not allowed", null, 405);
}