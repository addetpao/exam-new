/**
 * GA4 analytics events for authentication actions
 */

declare global {
  interface Window {
    gtag?: (
      command: "config" | "event",
      targetId: string,
      config?: Record<string, any>
    ) => void;
  }
}

/**
 * Analytics event types for authentication
 */
export type AuthEvent = 
  | "sign_up"
  | "login" 
  | "logout"
  | "email_verified"
  | "password_reset_request"
  | "password_reset_complete"
  | "oauth_login"
  | "account_created"
  | "session_expired";

/**
 * Track authentication events with GA4
 */
export function trackAuthEvent(
  event: AuthEvent,
  parameters?: Record<string, any>
) {
  // No-op fallback if gtag is not available
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  try {
    const eventData = {
      event_category: "authentication",
      event_label: event,
      ...parameters,
    };

    window.gtag("event", event, eventData);
    
    // Also track as a custom event for better analytics
    window.gtag("event", "auth_action", {
      custom_parameter: event,
      ...eventData,
    });
  } catch (error) {
    console.warn("Failed to track auth event:", error);
  }
}

/**
 * Track sign up events
 */
export function trackSignUp(method: "email" | "google" | "microsoft" = "email") {
  trackAuthEvent("sign_up", {
    method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track login events
 */
export function trackLogin(method: "email" | "google" | "microsoft" = "email") {
  trackAuthEvent("login", {
    method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track logout events
 */
export function trackLogout(reason?: "user_initiated" | "session_expired" | "forced") {
  trackAuthEvent("logout", {
    reason: reason || "user_initiated",
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track email verification
 */
export function trackEmailVerified() {
  trackAuthEvent("email_verified", {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track password reset requests
 */
export function trackPasswordResetRequest() {
  trackAuthEvent("password_reset_request", {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track password reset completion
 */
export function trackPasswordResetComplete() {
  trackAuthEvent("password_reset_complete", {
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track OAuth login attempts
 */
export function trackOAuthLogin(
  provider: "google" | "microsoft",
  success: boolean
) {
  trackAuthEvent("oauth_login", {
    method: provider,
    success,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track account creation (after profile setup)
 */
export function trackAccountCreated(method: "email" | "google" | "microsoft") {
  trackAuthEvent("account_created", {
    method,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track session expiration
 */
export function trackSessionExpired(reason?: string) {
  trackAuthEvent("session_expired", {
    reason: reason || "timeout",
    timestamp: new Date().toISOString(),
  });
}
