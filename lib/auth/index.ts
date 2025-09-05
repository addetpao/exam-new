/**
 * Authentication module exports
 * Centralized access to all authentication functionality
 */

// Client-side exports
export { createClient as createBrowserClient, supabase } from "./client";
export { useAuth, useRequireAuth, useRequireRole, useHasRole } from "./hooks";
export type { AuthUser, AuthState } from "./hooks";

// Server-side exports
export { createClient as createServerClient } from "./server";
export { 
  getSession, 
  requireAuth, 
  requireRole, 
  assertVerifiedEmail,
  hasRole,
  updateLastLogin 
} from "./session";
export type { SessionUser } from "./session";

// Route guards and middleware
export { withAuth, withRole, guards } from "./guard";

// Role-based access control
export {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  hasPermission,
  meetsRoleRequirement,
  getEqualOrHigherRoles,
  getRoleDisplayName,
  getRoleDescription,
  isValidRole,
} from "./roles";
export type { UserRole } from "./roles";

// Authentication configuration
export {
  authConfig,
  oauthProviders,
  getOAuthProvider,
  getEnabledOAuthProviders,
  validatePassword,
  calculatePasswordStrength,
  getRedirectURIs,
} from "./config";

// Error handling
export {
  AUTH_ERRORS,
  AuthError,
  mapSupabaseAuthError,
  createErrorResponse,
} from "./errors";
export type { AuthErrorCode } from "./errors";

// Analytics events
export {
  trackAuthEvent,
  trackSignUp,
  trackLogin,
  trackLogout,
  trackEmailVerified,
  trackPasswordResetRequest,
  trackPasswordResetComplete,
  trackOAuthLogin,
  trackAccountCreated,
  trackSessionExpired,
} from "./events";
export type { AuthEvent } from "./events";

// Database types
export type { Database } from "../database.types";