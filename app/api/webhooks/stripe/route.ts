import { NextRequest } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createSuccessResponse, createErrorResponse, handleAPIError } from "@/lib/server/utils/api-response";
import { createSupabaseAdmin } from "@/lib/server/db/supabase";
import { ga4Analytics } from "@/lib/server/analytics/ga4";
import { stripe, updateSubscriptionFromStripe, getPlanByPriceId } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/stripe - Handle Stripe webhook events
 * Processes subscription lifecycle events with idempotency
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return createErrorResponse("BAD_REQUEST", "Missing Stripe signature", null, 400);
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return createErrorResponse("BAD_REQUEST", "Invalid webhook signature", null, 400);
    }

    const supabase = createSupabaseAdmin();

    // Check for idempotency - prevent duplicate processing
    const { data: existingEvent } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`Webhook event ${event.id} already processed`);
      return createSuccessResponse({ received: true, already_processed: true });
    }

    // Log the webhook event
    await supabase
      .from("webhook_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        data: event.data,
      });

    // Process the event based on type
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionFromStripe(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionFromStripe(subscription);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handlePaymentSuccess(invoice);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await handlePaymentFailed(invoice);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return createSuccessResponse({ received: true, event_type: event.type });

  } catch (error) {
    console.error("Webhook processing error:", error);
    return handleAPIError(error);
  }
}

/**
 * Handle refund events
 */
async function handleRefund(charge: Stripe.Charge) {
  const supabase = createSupabaseAdmin();

  // Get customer details
  const customer = await stripe.customers.retrieve(charge.customer as string);
  if (!customer || customer.deleted) {
    console.error("Customer not found for refund:", charge.id);
    return;
  }

  const customerEmail = (customer as Stripe.Customer).email;
  if (!customerEmail) {
    console.error("Customer email not found for refund:", charge.id);
    return;
  }

  // Find user by email
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("email", customerEmail)
    .single();

  if (userError || !user) {
    console.error("User not found for email:", customerEmail);
    return;
  }

  // Update subscription status to refunded
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id);

  // Log the refund
  await supabase
    .from("payment_history")
    .insert({
      user_id: user.id,
      stripe_charge_id: charge.id,
      amount: -charge.amount_refunded, // Negative for refund
      currency: charge.currency,
      status: "refunded",
      refunded_at: new Date().toISOString(),
    });

  // Track analytics
  try {
    await ga4Analytics.trackRefund(user.id, {
      refund_id: charge.id,
      amount: charge.amount_refunded / 100, // Convert to dollars
      currency: charge.currency,
      reason: "charge_refunded",
    });
  } catch (error) {
    console.warn("Failed to track refund analytics:", error);
  }

  console.log(`Refund processed for user ${user.id}: ${charge.amount_refunded} ${charge.currency}`);
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();

  const customer = await stripe.customers.retrieve(invoice.customer as string);
  if (!customer || customer.deleted) return;

  const customerEmail = (customer as Stripe.Customer).email;
  if (!customerEmail) return;

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", customerEmail)
    .single();

  if (!user) return;

  // Log successful payment
  await supabase
    .from("payment_history")
    .insert({
      user_id: user.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      paid_at: new Date(invoice.status_transitions.paid_at! * 1000).toISOString(),
    });

  console.log(`Payment succeeded for user ${user.id}: ${invoice.amount_paid} ${invoice.currency}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const supabase = createSupabaseAdmin();

  const customer = await stripe.customers.retrieve(invoice.customer as string);
  if (!customer || customer.deleted) return;

  const customerEmail = (customer as Stripe.Customer).email;
  if (!customerEmail) return;

  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", customerEmail)
    .single();

  if (!user) return;

  // Log failed payment
  await supabase
    .from("payment_history")
    .insert({
      user_id: user.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_due,
      currency: invoice.currency,
      status: "failed",
      failed_at: new Date().toISOString(),
    });

  // Optionally, update subscription status or send notification
  console.log(`Payment failed for user ${user.id}: ${invoice.amount_due} ${invoice.currency}`);
}

/**
 * Handle completed checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`Checkout completed: ${session.id} for customer: ${session.customer}`);
  
  // If this is a subscription checkout, the subscription webhook will handle the rest
  if (session.subscription) {
    console.log(`Subscription checkout completed: ${session.subscription}`);
  } else {
    console.log(`One-time payment checkout completed: ${session.payment_intent}`);
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