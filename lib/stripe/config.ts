import Stripe from "stripe";

// Initialize Stripe with API key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

// Pricing configuration with self-assessment allowances
export const STRIPE_PRICING = {
  "30_DAY": {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_30D!,
    days: 30,
    selfAssessments: 0, // Base plan
    examAttempts: 5,
    displayPrice: "$19.99",
  },
  "60_DAY": {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_60D!,
    days: 60,
    selfAssessments: 1, // +1 additional
    examAttempts: 10,
    displayPrice: "$34.99",
  },
  "90_DAY": {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_90D!,
    days: 90,
    selfAssessments: 2, // +2 additional
    examAttempts: 15,
    displayPrice: "$49.99",
  },
  "180_DAY": {
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_180D!,
    days: 180,
    selfAssessments: 3, // +3 additional
    examAttempts: 30,
    displayPrice: "$89.99",
  },
} as const;

export type SubscriptionPlan = keyof typeof STRIPE_PRICING;

// Get plan details by price ID
export function getPlanByPriceId(priceId: string) {
  return Object.entries(STRIPE_PRICING).find(
    ([_, config]) => config.priceId === priceId
  );
}

// Get plan details by plan key
export function getPlanConfig(plan: SubscriptionPlan) {
  return STRIPE_PRICING[plan];
}

// Validate price ID
export function isValidPriceId(priceId: string): boolean {
  return Object.values(STRIPE_PRICING).some(config => config.priceId === priceId);
}

// Calculate subscription dates
export function calculateSubscriptionDates(planDays: number) {
  const startAt = new Date();
  const endAt = new Date();
  endAt.setDate(startAt.getDate() + planDays);
  
  return {
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  };
}

// Check if subscription is active
export function isSubscriptionActive(endAt: string, status: string): boolean {
  const now = new Date();
  const subscriptionEnd = new Date(endAt);
  return now < subscriptionEnd && ["active", "trialing"].includes(status);
}