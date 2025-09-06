import { createClient } from "./server";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];
type UserRole = Database["public"]["Enums"]["user_role"];

export interface SessionUser extends User {
  profile?: UserProfile;
}

/**
 * Get the current session with user profile data
 * Cached for the duration of the request
 */
export const getSession = cache(
  async (): Promise<{
    user: SessionUser | null;
    session: any;
  }> => {
    const supabase = createClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return { user: null, session: null };
    }

    // Fetch user profile data
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileError) {
      console.error("Failed to fetch user profile:", profileError);
      return { user: session.user, session };
    }

    return {
      user: { ...session.user, profile },
      session,
    };
  }
);

/**
 * Require user to be authenticated and email verified
 * Redirects to auth page if not authenticated or verified
 */
export async function requireAuth(): Promise<SessionUser> {
  const { user } = await getSession();

  if (!user) {
    redirect("/auth/signin");
  }

  if (!user.profile?.email_confirmed) {
    redirect("/auth/verify-email");
  }

  return user;
}

/**
 * Require user to have specific role
 * Redirects to unauthorized page if user doesn't have required role
 */
export async function requireRole(
  requiredRole: UserRole
): Promise<SessionUser> {
  const user = await requireAuth();

  if (!user.profile) {
    redirect("/auth/signin");
  }

  const userRole = user.profile.app_role;

  // Role hierarchy: admin > content_editor > user
  const roleHierarchy = {
    admin: 3,
    content_editor: 2,
    user: 1,
  };

  const userLevel = roleHierarchy[userRole];
  const requiredLevel = roleHierarchy[requiredRole];

  if (userLevel < requiredLevel) {
    redirect("/unauthorized");
  }

  return user;
}

/**
 * Assert user has verified email
 * Throws error if email not confirmed
 */
export async function assertVerifiedEmail(): Promise<SessionUser> {
  const { user } = await getSession();

  if (!user) {
    throw new Error("User not authenticated");
  }

  if (!user.profile?.email_confirmed) {
    throw new Error("Email not verified");
  }

  return user;
}

/**
 * Check if user has specific role without redirecting
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const { user } = await getSession();

  if (!user?.profile) {
    return false;
  }

  const userRole = user.profile.app_role;

  const roleHierarchy = {
    admin: 3,
    content_editor: 2,
    user: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Update user's last login timestamp and create new session version
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = createClient();

  // Generate new session version to invalidate other sessions
  const sessionVersion = crypto.randomUUID();

  await supabase
    .from("users")
    .update({
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      session_version: sessionVersion, // This will invalidate other active sessions
    })
    .eq("id", userId);
}

/**
 * Check if current session is valid (for single session enforcement)
 */
export async function validateSession(): Promise<boolean> {
  const { user, session } = await getSession();

  if (!user?.profile || !session) {
    return false;
  }

  // Check if session version matches the one in database
  const sessionVersion = session.user.user_metadata?.session_version;
  if (!sessionVersion || sessionVersion !== user.profile.session_version) {
    return false;
  }

  return true;
}

/**
 * Invalidate all sessions for a user (force logout everywhere)
 */
export async function invalidateAllSessions(userId: string): Promise<void> {
  const supabase = createClient();

  // Update session version to invalidate all current sessions
  const newSessionVersion = crypto.randomUUID();

  await supabase
    .from("users")
    .update({
      session_version: newSessionVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  // Also sign out current session
  await supabase.auth.signOut();
}

/**
 * Create session with version tracking for single session enforcement
 */
export async function createSessionWithVersion(
  email: string,
  password: string
): Promise<{ user: any; session: any; error?: any }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { user: null, session: null, error };
  }

  // Generate session version for this login
  const sessionVersion = crypto.randomUUID();

  // Update user with new session version
  await supabase
    .from("users")
    .update({
      session_version: sessionVersion,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);

  // Update user metadata with session version
  await supabase.auth.updateUser({
    data: {
      ...data.user.user_metadata,
      session_version: sessionVersion,
    },
  });

  return { user: data.user, session: data.session };
}

/**
 * Enhanced OAuth callback with session versioning
 */
export async function handleOAuthCallbackWithVersion(
  userId: string,
  metadata: any
): Promise<void> {
  const supabase = createClient();

  // Generate session version for this OAuth login
  const sessionVersion = crypto.randomUUID();

  // Update user profile and session version
  await supabase.from("users").upsert(
    {
      id: userId,
      session_version: sessionVersion,
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Map OAuth metadata to profile fields
      full_name: metadata.full_name || metadata.name || null,
      avatar_url: metadata.avatar_url || null,
      email_confirmed: true, // OAuth users have verified emails
    },
    {
      onConflict: "id",
    }
  );

  // Update user metadata with session version
  await supabase.auth.updateUser({
    data: {
      ...metadata,
      session_version: sessionVersion,
    },
  });
}
