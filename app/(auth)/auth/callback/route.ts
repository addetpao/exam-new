import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";
import { trackOAuthLogin, trackLogin } from "@/lib/auth/events";

/**
 * Authentication callback handler for OAuth providers and email confirmation
 * Handles both OAuth login and email verification flows
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);

    const redirectUrl = new URL("/auth/signin", request.url);
    redirectUrl.searchParams.set("error", error);
    redirectUrl.searchParams.set(
      "message",
      errorDescription || "Authentication failed"
    );

    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = createClient();

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        console.error("Failed to exchange code for session:", sessionError);

        const redirectUrl = new URL("/auth/signin", request.url);
        redirectUrl.searchParams.set("error", "session_error");
        redirectUrl.searchParams.set(
          "message",
          "Failed to complete authentication"
        );

        return NextResponse.redirect(redirectUrl);
      }

      if (session?.user) {
        // Generate session version for single session enforcement
        const sessionVersion = crypto.randomUUID();

        // Check if user profile exists, create if needed
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!existingProfile) {
          // Create user profile for new OAuth users
          const { error: profileError } = await supabase.from("users").insert({
            id: session.user.id,
            email: session.user.email!,
            full_name:
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              null,
            avatar_url: session.user.user_metadata?.avatar_url || null,
            email_confirmed: true, // OAuth users have verified emails
            app_role: "user",
            session_version: sessionVersion,
            last_login_at: new Date().toISOString(),
          });

          if (profileError) {
            console.error("Failed to create user profile:", profileError);
          }
        } else {
          // Update existing user with new session version and last login
          await supabase
            .from("users")
            .update({
              session_version: sessionVersion,
              last_login_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.user.id);
        }

        // Update user metadata with session version
        await supabase.auth.updateUser({
          data: {
            ...session.user.user_metadata,
            session_version: sessionVersion,
          },
        });

        // Track login event (will be updated by client-side with correct method)
        // The client-side will handle the analytics event with proper provider info

        // Redirect to dashboard or original destination
        const redirectTo = searchParams.get("redirect") || "/dashboard";
        const redirectUrl = new URL(redirectTo, request.url);

        return NextResponse.redirect(redirectUrl);
      }
    } catch (error) {
      console.error("Auth callback error:", error);

      const redirectUrl = new URL("/auth/signin", request.url);
      redirectUrl.searchParams.set("error", "callback_error");
      redirectUrl.searchParams.set("message", "Authentication callback failed");

      return NextResponse.redirect(redirectUrl);
    }
  }

  // No code provided, redirect to signin
  const redirectUrl = new URL("/auth/signin", request.url);
  redirectUrl.searchParams.set("error", "missing_code");
  redirectUrl.searchParams.set("message", "Authentication code not provided");

  return NextResponse.redirect(redirectUrl);
}
