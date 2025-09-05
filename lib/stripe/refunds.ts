import { stripe } from "./config";
import { createSupabaseAdmin } from "@/lib/server/db/supabase";
import { ga4Analytics } from "@/lib/server/analytics/ga4";

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  daysActive?: number;
  qbankUsagePercent?: number;
}

/**
 * Check if user is eligible for refund
 * Policy: <7 days since start_at AND <10% QBank attempted
 */
export async function checkRefundEligibility(userId: string): Promise<RefundEligibility> {
  const supabase = createSupabaseAdmin();

  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .select("start_at, status, stripe_subscription_id")
    .eq("user_id", userId)
    .single();

  if (subError || !subscription) {
    return { eligible: false, reason: "No subscription found" };
  }

  if (subscription.status === "canceled" || subscription.status === "incomplete_expired") {
    return { eligible: false, reason: "Subscription already canceled or expired" };
  }

  // Check if within 7 days of start
  const startDate = new Date(subscription.start_at);
  const now = new Date();
  const daysActive = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysActive >= 7) {
    return { 
      eligible: false, 
      reason: "Refund period expired (>7 days)", 
      daysActive 
    };
  }

  // Check QBank usage
  const { data: attempts, error: attemptError } = await supabase
    .from("question_attempts")
    .select("id")
    .eq("user_id", userId);

  if (attemptError) {
    console.error("Failed to check question attempts:", attemptError);
    return { eligible: false, reason: "Unable to verify usage" };
  }

  const totalQuestions = 1000; // Assuming 1000 total QBank questions
  const attemptedQuestions = attempts?.length || 0;
  const usagePercent = (attemptedQuestions / totalQuestions) * 100;

  if (usagePercent >= 10) {
    return { 
      eligible: false, 
      reason: "Usage exceeds 10% of QBank", 
      daysActive,
      qbankUsagePercent: usagePercent 
    };
  }

  return { 
    eligible: true, 
    daysActive,
    qbankUsagePercent: usagePercent 
  };
}

/**
 * Process refund for a subscription
 * Only callable by admins
 */
export async function processRefund(
  userId: string, 
  adminUserId: string,
  reason: string
): Promise<{ success: boolean; refundId?: string; error?: string }> {
  const supabase = createSupabaseAdmin();

  try {
    // Verify admin permissions
    const { data: admin, error: adminError } = await supabase
      .from("users")
      .select("app_role")
      .eq("id", adminUserId)
      .single();

    if (adminError || admin?.app_role !== "admin") {
      return { success: false, error: "Unauthorized: Admin privileges required" };
    }

    // Check refund eligibility
    const eligibility = await checkRefundEligibility(userId);
    if (!eligibility.eligible) {
      return { success: false, error: `Not eligible for refund: ${eligibility.reason}` };
    }

    // Get subscription and latest payment
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (!subscription) {
      return { success: false, error: "Subscription not found" };
    }

    // Get latest invoice/payment from Stripe
    const invoices = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      subscription: subscription.stripe_subscription_id,
      limit: 1,
    });

    const latestInvoice = invoices.data[0];
    if (!latestInvoice?.charge) {
      return { success: false, error: "No payment found to refund" };
    }

    // Create refund
    const refund = await stripe.refunds.create({
      charge: latestInvoice.charge as string,
      reason: "requested_by_customer",
      metadata: {
        user_id: userId,
        admin_id: adminUserId,
        refund_reason: reason,
        processed_at: new Date().toISOString(),
      },
    });

    // Cancel subscription immediately
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

    // Update subscription status in database
    await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    // Log refund in audit trail
    await supabase
      .from("refund_audit_log")
      .insert({
        user_id: userId,
        admin_id: adminUserId,
        stripe_refund_id: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        reason: reason,
        processed_at: new Date().toISOString(),
      });

    // Track analytics
    try {
      await ga4Analytics.trackRefund(userId, {
        refund_id: refund.id,
        amount: refund.amount / 100, // Convert cents to dollars
        currency: refund.currency,
        reason: reason,
      });
    } catch (analyticsError) {
      console.warn("Failed to track refund analytics:", analyticsError);
    }

    console.log(`Refund processed for user ${userId}: ${refund.id}`);
    
    return { success: true, refundId: refund.id };

  } catch (error) {
    console.error("Refund processing error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Get refund history for a user
 */
export async function getRefundHistory(userId: string) {
  const supabase = createSupabaseAdmin();

  const { data: refunds, error } = await supabase
    .from("refund_audit_log")
    .select(`
      *,
      admin:admin_id (
        full_name,
        email
      )
    `)
    .eq("user_id", userId)
    .order("processed_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch refund history:", error);
    return [];
  }

  return refunds || [];
}