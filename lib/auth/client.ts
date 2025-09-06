import { createBrowserClient } from "@supabase/ssr";
import { Database } from "../database.types";

/**
 * Supabase client for browser-side usage
 * Handles automatic token refresh and persistence
 */
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

/**
 * Singleton client instance for browser usage
 */
export const supabase = createClient();
