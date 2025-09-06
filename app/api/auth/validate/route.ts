import { NextRequest } from "next/server";
import { createClient } from "@/lib/auth/server";

/**
 * GET /api/auth/validate - Validate current session and check for conflicts
 * Used for single session enforcement and session health checks
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current session
    const {
      data: { session, user },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !user) {
      return Response.json(
        { 
          valid: false, 
          reason: "No active session",
          needsReauth: true
        },
        { status: 401 }
      );
    }

    // Get user profile to check session version
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("session_version, email_confirmed, app_role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return Response.json(
        { 
          valid: false, 
          reason: "User profile not found",
          needsReauth: true
        },
        { status: 404 }
      );
    }

    // Check session version for single session enforcement
    const sessionVersion = user.user_metadata?.session_version;
    if (!sessionVersion || sessionVersion !== profile.session_version) {
      return Response.json(
        { 
          valid: false, 
          reason: "Session invalidated by newer login",
          needsReauth: true,
          message: "You have been logged out because you signed in from another device."
        },
        { status: 401 }
      );
    }

    // Check email verification
    if (!profile.email_confirmed) {
      return Response.json(
        { 
          valid: false, 
          reason: "Email not verified",
          needsEmailVerification: true
        },
        { status: 403 }
      );
    }

    // Session is valid
    return Response.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile.app_role,
        emailConfirmed: profile.email_confirmed,
        sessionVersion: sessionVersion
      }
    });

  } catch (error) {
    console.error("Session validation error:", error);
    return Response.json(
      { 
        valid: false, 
        reason: "Validation error",
        error: "An unexpected error occurred during session validation"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/validate - Force session validation and cleanup invalid sessions
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current session
    const {
      data: { session, user },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session || !user) {
      return Response.json(
        { 
          action: "signed_out",
          reason: "No valid session found"
        }
      );
    }

    // Check session validity
    const { data: profile } = await supabase
      .from("users")
      .select("session_version, email_confirmed")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Sign out if user profile doesn't exist
      await supabase.auth.signOut();
      return Response.json(
        { 
          action: "signed_out",
          reason: "User profile not found"
        }
      );
    }

    const sessionVersion = user.user_metadata?.session_version;
    if (!sessionVersion || sessionVersion !== profile.session_version) {
      // Sign out if session is invalidated
      await supabase.auth.signOut();
      return Response.json(
        { 
          action: "signed_out",
          reason: "Session invalidated by newer login"
        }
      );
    }

    return Response.json({
      action: "validated",
      message: "Session is valid"
    });

  } catch (error) {
    console.error("Session cleanup error:", error);
    return Response.json(
      { 
        action: "error",
        error: "Failed to validate session"
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function PUT() {
  return Response.json(
    { error: "PUT method not allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return Response.json(
    { error: "DELETE method not allowed" },
    { status: 405 }
  );
}