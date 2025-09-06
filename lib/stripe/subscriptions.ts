import { stripe, getPlanByPriceId, calculateSubscriptionDates } from "./config";
import { createSupabaseAdmin } from "@/lib/server/db/supabase";
import { ga4Analytics } from "@/lib/server/analytics/ga4";

export interface SubscriptionData {
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status:
    | "active"
    | "trialing"
    | "past_due"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  plan_key: string;
  plan_days: number;
  self_assessment_remaining: number;
  exam_attempts_remaining: number;
  start_at: string;
  end_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Update subscription in database from Stripe subscription object
 */
export async function updateSubscriptionFromStripe(
  subscription: any, // Stripe.Subscription
  userId?: string
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Get customer if user ID not provided
  if (!userId) {
    const customer = await stripe.customers.retrieve(
      subscription.customer as string
    );
    if (!customer || customer.deleted) {
      throw new Error("Customer not found");
    }

    const customerEmail = (customer as any).email;
    if (!customerEmail) {
      throw new Error("Customer email not found");
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (error || !user) {
      throw new Error(`User not found for email: ${customerEmail}`);
    }

    userId = user.id;
  }

  // Determine plan from price
  const priceId = subscription.items.data[0]?.price?.id;
  const planEntry = getPlanByPriceId(priceId);

  if (!planEntry) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  const [planKey, planConfig] = planEntry;
  const subscriptionDates = calculateSubscriptionDates(planConfig.days);

  // Prepare subscription data
  const subscriptionData: Partial<SubscriptionData> = {
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    status: mapStripeStatus(subscription.status),
    plan_key: planKey,
    plan_days: planConfig.days,
    self_assessment_remaining: planConfig.selfAssessments,
    exam_attempts_remaining: planConfig.examAttempts,
    start_at: subscriptionDates.start_at,
    end_at: subscriptionDates.end_at,
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription record
  const { error: upsertError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, {
      onConflict: "user_id",
    });

  if (upsertError) {
    console.error("Failed to update subscription:", upsertError);
    throw upsertError;
  }

  // Track analytics event
  const eventType =
    subscription.status === "trialing"
      ? "subscription_started"
      : subscription.status === "active"
        ? "subscription_activated"
        : subscription.status === "canceled"
          ? "subscription_cancelled"
          : "subscription_updated";

  try {
    await ga4Analytics.trackSubscription(userId, {
      event_type: eventType as any,
      tier: planKey,
      value: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency || "usd",
    });
  } catch (analyticsError) {
    console.warn("Failed to track analytics event:", analyticsError);
  }

  console.log(`Subscription updated for user ${userId}: ${subscription.id}`);
}

/**
 * Map Stripe subscription status to our internal status
 */
function mapStripeStatus(stripeStatus: string): SubscriptionData["status"] {
  switch (stripeStatus) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "unpaid":
      return "unpaid";
    default:
      return "canceled";
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd = true
) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
}

/**
 * Resume subscription (remove cancellation)
 */
export async function resumeSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, end_at")
    .eq("user_id", userId)
    .single();

  if (!subscription) return false;

  const now = new Date();
  const endAt = new Date(subscription.end_at);

  return now < endAt && ["active", "trialing"].includes(subscription.status);
}

/**
 * Get user's subscription details
 */
export async function getUserSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  const supabase = createSupabaseAdmin();

  const { data: subscription, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !subscription) {
    return null;
  }

  return subscription as SubscriptionData;
}
