import {
  stripe,
  getPlanByPriceId,
  SubscriptionPlan,
  getPlanConfig,
} from "./config";
import { getOrCreateCustomer, UserProfile } from "./customers";

export interface CheckoutSessionOptions {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  user: UserProfile,
  options: CheckoutSessionOptions
): Promise<string> {
  // Validate price ID
  const planEntry = getPlanByPriceId(options.priceId);
  if (!planEntry) {
    throw new Error(`Invalid price ID: ${options.priceId}`);
  }

  const [planKey, planConfig] = planEntry;

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(user);

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: options.priceId,
        quantity: 1,
      },
    ],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    subscription_data: {
      trial_period_days: options.trialPeriodDays,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
        plan_days: planConfig.days.toString(),
        self_assessments: planConfig.selfAssessments.toString(),
        exam_attempts: planConfig.examAttempts.toString(),
        source: "examprep_checkout",
        ...options.metadata,
      },
    },
    metadata: {
      user_id: user.id,
      plan_key: planKey,
      plan_days: planConfig.days.toString(),
      source: "examprep_checkout",
      ...options.metadata,
    },
    allow_promotion_codes: true,
    billing_address_collection: "required",
    customer_update: {
      address: "auto",
      name: "auto",
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}

/**
 * Create a one-time payment session (for future use)
 */
export async function createOneTimePaymentSession(
  user: UserProfile,
  amount: number,
  currency: string,
  successUrl: string,
  cancelUrl: string,
  metadata?: Record<string, string>
): Promise<string> {
  const customerId = await getOrCreateCustomer(user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: currency,
          unit_amount: amount,
          product_data: {
            name: "ExamPrep Platform - One-time Purchase",
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      user_id: user.id,
      type: "one_time_payment",
      ...metadata,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create payment session URL");
  }

  return session.url;
}
