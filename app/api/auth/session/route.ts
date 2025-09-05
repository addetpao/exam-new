import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, handleAPIError } from "@/lib/server/utils/api-response";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/server/db/supabase";
import { SessionResponseSchema } from "@/lib/server/validation/schemas";

/**
 * GET /api/auth/session - Get current user session
 * Returns authenticated user profile with subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createErrorResponse("UNAUTHORIZED", "Not authenticated", null, 401);
    }

    // Get user profile with subscription details
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        email,
        role,
        subscription_status,
        subscription_tier,
        trial_ends_at,
        created_at
      `)
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return createErrorResponse("INTERNAL_ERROR", "Failed to fetch user profile", null, 500);
    }

    if (!profile) {
      return createErrorResponse("NOT_FOUND", "User profile not found", null, 404);
    }

    const sessionData = {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        subscription_status: profile.subscription_status,
        subscription_tier: profile.subscription_tier,
        trial_ends_at: profile.trial_ends_at,
        created_at: profile.created_at,
      }
    };

    // Validate response schema
    const validatedData = SessionResponseSchema.parse(sessionData);

    return createSuccessResponse(validatedData);

  } catch (error) {
    return handleAPIError(error);
  }
}

/**
 * POST /api/auth/session - Refresh user session
 * Updates session and returns fresh user data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();
    
    // Refresh the session
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !session?.user) {
      return createErrorResponse("UNAUTHORIZED", "Session refresh failed", null, 401);
    }

    // Get updated user profile
    const supabaseAdmin = createSupabaseAdmin();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("users")
      .select(`
        id,
        email,
        role,
        subscription_status,
        subscription_tier,
        trial_ends_at,
        created_at
      `)
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile) {
      return createErrorResponse("INTERNAL_ERROR", "Failed to fetch updated user profile", null, 500);
    }

    const sessionData = {
      user: {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        subscription_status: profile.subscription_status,
        subscription_tier: profile.subscription_tier,
        trial_ends_at: profile.trial_ends_at,
        created_at: profile.created_at,
      }
    };

    // Validate response schema
    const validatedData = SessionResponseSchema.parse(sessionData);

    return createSuccessResponse(validatedData);

  } catch (error) {
    return handleAPIError(error);
  }
}

// Handle unsupported methods
export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "PUT method not allowed", null, 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "DELETE method not allowed", null, 405);
}