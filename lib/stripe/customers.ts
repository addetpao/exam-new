import { stripe } from "./config";
import { createSupabaseAdmin } from "@/lib/server/db/supabase";

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string | null;
}

/**
 * Get or create a Stripe customer for a user
 * Returns existing customer if already exists, creates new one if not
 */
export async function getOrCreateCustomer(user: UserProfile): Promise<string> {
  const supabase = createSupabaseAdmin();

  // Check if user already has a Stripe customer ID
  const { data: existingUser } = await supabase
    .from("users")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (existingUser?.stripe_customer_id) {
    // Verify customer still exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(
        existingUser.stripe_customer_id
      );
      if (customer && !customer.deleted) {
        return existingUser.stripe_customer_id;
      }
    } catch (error) {
      console.log("Existing Stripe customer not found, creating new one");
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.full_name || undefined,
    metadata: {
      user_id: user.id,
      source: "examprep_platform",
    },
  });

  // Update user record with Stripe customer ID
  await supabase
    .from("users")
    .update({
      stripe_customer_id: customer.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  return customer.id;
}

/**
 * Update customer information in Stripe
 */
export async function updateCustomer(
  customerId: string,
  updates: {
    email?: string;
    name?: string;
    metadata?: Record<string, string>;
  }
) {
  return await stripe.customers.update(customerId, {
    email: updates.email,
    name: updates.name,
    metadata: updates.metadata,
  });
}
