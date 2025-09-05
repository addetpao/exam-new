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
export const getSession = cache(async (): Promise<{
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
});

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
export async function requireRole(requiredRole: UserRole): Promise<SessionUser> {
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
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const supabase = createClient();
  
  await supabase
    .from("users")
    .update({ 
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}