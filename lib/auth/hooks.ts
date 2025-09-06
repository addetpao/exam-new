"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "./client";
import { trackLogin, trackLogout, trackSessionExpired } from "./events";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "../database.types";

type UserProfile = Database["public"]["Tables"]["users"]["Row"];

export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

/**
 * Main authentication hook
 * Provides current user state and authentication methods
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  const router = useRouter();
  const supabase = createClient();

  // Fetch user profile data
  const fetchUserProfile = async (
    userId: string
  ): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Failed to get session:", error);
          if (mounted) {
            setState((prev) => ({
              ...prev,
              error: error.message,
              loading: false,
            }));
          }
          return;
        }

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);
          if (mounted) {
            setState({
              user: { ...session.user, profile },
              session,
              loading: false,
              error: null,
            });
          }
        } else {
          if (mounted) {
            setState({
              user: null,
              session: null,
              loading: false,
              error: null,
            });
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error:
              error instanceof Error ? error.message : "Authentication error",
            loading: false,
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT") {
        setState({
          user: null,
          session: null,
          loading: false,
          error: null,
        });
        trackLogout("user_initiated");
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        // Session refreshed, update state if needed
        if (session?.user && state.user) {
          setState((prev) => ({ ...prev, session }));
        }
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setState({
          user: { ...session.user, profile },
          session,
          loading: false,
          error: null,
        });

        // Track login event
        trackLogin("email"); // Default to email, will be overridden by OAuth flows
        return;
      }

      // Handle other events
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setState({
          user: { ...session.user, profile },
          session,
          loading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          session: null,
          loading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // Note: dependencies intentionally left minimal to avoid re-subscribing unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Refresh user profile
  const refreshProfile = async () => {
    if (!state.user) return;

    const profile = await fetchUserProfile(state.user.id);
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, profile } : null,
    }));
  };

  // Sign out
  const signOut = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        setState((prev) => ({ ...prev, error: error.message, loading: false }));
        return;
      }

      // State will be updated by the auth state change listener
      router.push("/");
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Sign out failed",
        loading: false,
      }));
    }
  };

  return {
    ...state,
    signOut,
    refreshProfile,
    isAuthenticated: !!state.user,
    isEmailVerified: !!state.user?.profile?.email_confirmed,
    userRole: state.user?.profile?.app_role || "user",
  };
}

/**
 * Hook to require authentication
 * Redirects to sign-in if user is not authenticated
 */
export function useRequireAuth(redirectTo: string = "/auth/signin") {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.push(redirectTo);
    }
  }, [auth.loading, auth.user, router, redirectTo]);

  return auth;
}

/**
 * Hook to require specific role
 * Redirects to unauthorized if user doesn't have required role
 */
export function useRequireRole(requiredRole: UserProfile["app_role"]) {
  const auth = useRequireAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && auth.user && auth.user.profile) {
      const userRole = auth.user.profile.app_role;

      const roleHierarchy = {
        admin: 3,
        content_editor: 2,
        user: 1,
      };

      const userLevel = roleHierarchy[userRole];
      const requiredLevel = roleHierarchy[requiredRole];

      if (userLevel < requiredLevel) {
        router.push("/unauthorized");
      }
    }
  }, [auth.loading, auth.user, requiredRole, router]);

  return auth;
}

/**
 * Hook to check if user has specific role without redirecting
 */
export function useHasRole(role: UserProfile["app_role"]): boolean {
  const auth = useAuth();

  if (!auth.user?.profile) return false;

  const userRole = auth.user.profile.app_role;

  const roleHierarchy = {
    admin: 3,
    content_editor: 2,
    user: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[role];
}

/**
 * Hook for session validation with automatic logout on session conflicts
 * Implements single session enforcement by checking session versions
 */
export function useSessionValidation(intervalMs: number = 60000) {
  const auth = useAuth();
  const router = useRouter();
  const [lastValidation, setLastValidation] = useState<number>(0);

  const validateSession = async () => {
    if (!auth.user || !auth.session) return;

    try {
      const response = await fetch("/api/auth/validate", {
        method: "GET",
        credentials: "include",
      });

      const result = await response.json();

      if (!result.valid) {
        if (result.needsReauth) {
          // Session invalidated by another login
          trackSessionExpired("session_conflict");
          
          // Sign out locally
          await auth.signOut();
          
          // Show message if provided
          if (result.message) {
            // You can implement a toast notification here
            console.warn("Session invalidated:", result.message);
          }
          
          router.push("/auth/signin?message=" + encodeURIComponent(
            result.message || "Your session has expired. Please sign in again."
          ));
        } else if (result.needsEmailVerification) {
          router.push("/auth/verify-email");
        }
      }

      setLastValidation(Date.now());
    } catch (error) {
      console.error("Session validation failed:", error);
      // Continue without taking action on network errors
    }
  };

  // Run validation periodically
  useEffect(() => {
    if (!auth.user) return;

    // Run immediate validation on mount
    validateSession();

    // Set up periodic validation
    const interval = setInterval(validateSession, intervalMs);

    return () => clearInterval(interval);
  }, [auth.user, intervalMs]);

  // Also validate on window focus
  useEffect(() => {
    const handleFocus = () => {
      const timeSinceLastValidation = Date.now() - lastValidation;
      // Only validate if more than 30 seconds have passed since last validation
      if (timeSinceLastValidation > 30000 && auth.user) {
        validateSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [lastValidation, auth.user]);

  return { lastValidation, validateSession };
}

/**
 * Hook to handle logout with options for single device or all devices
 */
export function useLogout() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const logout = async (logoutAll: boolean = false) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/auth/logout?all=${logoutAll}`, {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        // Navigate to home page
        router.push("/");
      } else {
        console.error("Logout failed:", await response.text());
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const logoutCurrentDevice = () => logout(false);
  const logoutAllDevices = () => logout(true);

  return {
    logout: logoutCurrentDevice,
    logoutAll: logoutAllDevices,
    loading,
  };
}

/**
 * Hook to get session info including validation status
 */
export function useSessionInfo() {
  const auth = useAuth();
  const [sessionInfo, setSessionInfo] = useState({
    isValid: true,
    lastValidated: 0,
    sessionVersion: null as string | null,
  });

  useEffect(() => {
    if (auth.session?.user?.user_metadata?.session_version) {
      setSessionInfo(prev => ({
        ...prev,
        sessionVersion: auth.session.user.user_metadata.session_version,
      }));
    }
  }, [auth.session]);

  return {
    ...sessionInfo,
    hasValidSession: auth.isAuthenticated && sessionInfo.isValid,
  };
}
