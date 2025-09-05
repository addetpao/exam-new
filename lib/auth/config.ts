import { Provider } from "@supabase/supabase-js";

/**
 * Authentication configuration and provider settings
 */

export interface AuthConfig {
  // Session settings
  sessionTimeout: number; // in seconds
  rememberMeDuration: number; // in seconds
  
  // Password requirements
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  
  // Rate limiting
  maxSignInAttempts: number;
  lockoutDuration: number; // in seconds
  
  // Email settings
  requireEmailVerification: boolean;
  resendVerificationDelay: number; // in seconds
  
  // OAuth providers
  enabledProviders: Provider[];
}

export const authConfig: AuthConfig = {
  // 24 hours for regular session, 30 days for "remember me"
  sessionTimeout: 24 * 60 * 60,
  rememberMeDuration: 30 * 24 * 60 * 60,
  
  // Strong password requirements
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSymbols: false, // Optional for better UX
  
  // Rate limiting to prevent brute force
  maxSignInAttempts: 5,
  lockoutDuration: 15 * 60, // 15 minutes
  
  // Email verification required for all accounts
  requireEmailVerification: true,
  resendVerificationDelay: 60, // 1 minute between resends
  
  // OAuth providers configuration
  enabledProviders: ["google", "azure"],
};

/**
 * OAuth provider configurations
 */
export const oauthProviders = {
  google: {
    name: "Google",
    provider: "google" as Provider,
    scopes: "openid email profile",
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    options: {
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  },
  microsoft: {
    name: "Microsoft",
    provider: "azure" as Provider,
    scopes: "openid email profile",
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    options: {
      queryParams: {
        prompt: "consent",
      },
    },
  },
} as const;

/**
 * Get OAuth provider configuration
 */
export function getOAuthProvider(provider: keyof typeof oauthProviders) {
  return oauthProviders[provider];
}

/**
 * Get all enabled OAuth providers
 */
export function getEnabledOAuthProviders() {
  return authConfig.enabledProviders
    .map(provider => {
      if (provider === "google") return oauthProviders.google;
      if (provider === "azure") return oauthProviders.microsoft;
      return null;
    })
    .filter(Boolean);
}

/**
 * Validate password against requirements
 */
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < authConfig.passwordMinLength) {
    errors.push(`Password must be at least ${authConfig.passwordMinLength} characters long`);
  }
  
  if (authConfig.passwordRequireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  
  if (authConfig.passwordRequireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  
  if (authConfig.passwordRequireNumbers && !/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  
  if (authConfig.passwordRequireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one symbol");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: "Very Weak" | "Weak" | "Fair" | "Good" | "Strong";
} {
  let score = 0;
  
  // Length bonus
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (password.length >= 16) score += 10;
  
  // Character variety
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
  
  // Avoid common patterns
  if (!/(.)\1{2,}/.test(password)) score += 5; // No repeated characters
  if (!/123|abc|qwe|password/i.test(password)) score += 5; // No common patterns
  
  let label: "Very Weak" | "Weak" | "Fair" | "Good" | "Strong";
  if (score < 30) label = "Very Weak";
  else if (score < 50) label = "Weak";
  else if (score < 70) label = "Fair";
  else if (score < 90) label = "Good";
  else label = "Strong";
  
  return { score: Math.min(100, score), label };
}

/**
 * Environment-specific redirect URIs for OAuth providers
 */
export function getRedirectURIs() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  
  return {
    development: {
      google: `${baseUrl}/auth/callback`,
      microsoft: `${baseUrl}/auth/callback`,
    },
    preview: {
      google: "https://examprep-platform-preview.vercel.app/auth/callback",
      microsoft: "https://examprep-platform-preview.vercel.app/auth/callback",
    },
    production: {
      google: "https://examprep-platform.vercel.app/auth/callback",
      microsoft: "https://examprep-platform.vercel.app/auth/callback",
    },
  };
}
