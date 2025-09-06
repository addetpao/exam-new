import { NextRequest } from "next/server";
import { createClient } from "@/lib/auth/server";
import { trackLogout } from "@/lib/auth/events";

/**
 * POST /api/auth/logout - Sign out user and invalidate session
 * Handles both single session and all session logout
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const logoutAll = searchParams.get("all") === "true";

    // Get current user before signing out
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (logoutAll) {
      // Invalidate all sessions by updating session version
      const newSessionVersion = crypto.randomUUID();

      await supabase
        .from("users")
        .update({
          session_version: newSessionVersion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    // Sign out current session
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      console.error("Logout error:", signOutError);
      return Response.json(
        { error: "Failed to logout" },
        { status: 500 }
      );
    }

    // Track logout event
    trackLogout();

    return Response.json({
      success: true,
      message: logoutAll 
        ? "Logged out from all devices successfully"
        : "Logged out successfully"
    });

  } catch (error) {
    console.error("Logout API error:", error);
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return Response.json(
    { error: "GET method not allowed" },
    { status: 405 }
  );
}

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