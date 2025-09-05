// Main Stripe exports
export { stripe, STRIPE_PRICING, getPlanByPriceId, getPlanConfig, isValidPriceId, calculateSubscriptionDates, isSubscriptionActive } from "./config";
export type { SubscriptionPlan } from "./config";

export { getOrCreateCustomer, updateCustomer } from "./customers";
export type { UserProfile } from "./customers";

export { createCheckoutSession, createOneTimePaymentSession } from "./checkout";
export type { CheckoutSessionOptions } from "./checkout";

export { 
  updateSubscriptionFromStripe, 
  cancelSubscription, 
  resumeSubscription, 
  hasActiveSubscription, 
  getUserSubscription 
} from "./subscriptions";
export type { SubscriptionData } from "./subscriptions";

export { 
  checkRefundEligibility, 
  processRefund, 
  getRefundHistory 
} from "./refunds";
export type { RefundEligibility } from "./refunds";