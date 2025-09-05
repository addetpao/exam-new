/**
 * Authentication error codes and messages
 */
export const AUTH_ERRORS = {
  // General auth errors
  INVALID_CREDENTIALS: {
    code: "INVALID_CREDENTIALS",
    message: "Invalid email or password",
    userMessage: "The email or password you entered is incorrect. Please try again.",
  },
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    message: "User not found",
    userMessage: "No account found with this email address.",
  },
  WEAK_PASSWORD: {
    code: "WEAK_PASSWORD",
    message: "Password does not meet requirements",
    userMessage: "Password must be at least 8 characters long and include uppercase, lowercase, and numbers.",
  },
  EMAIL_ALREADY_REGISTERED: {
    code: "EMAIL_ALREADY_REGISTERED",
    message: "Email already registered",
    userMessage: "An account with this email already exists. Try signing in instead.",
  },
  
  // Email verification
  EMAIL_NOT_VERIFIED: {
    code: "EMAIL_NOT_VERIFIED",
    message: "Email address not verified",
    userMessage: "Please check your email and click the verification link before continuing.",
  },
  VERIFICATION_LINK_EXPIRED: {
    code: "VERIFICATION_LINK_EXPIRED",
    message: "Email verification link expired",
    userMessage: "Your verification link has expired. We'll send you a new one.",
  },
  
  // Session and access
  SESSION_EXPIRED: {
    code: "SESSION_EXPIRED",
    message: "Session has expired",
    userMessage: "Your session has expired. Please sign in again.",
  },
  INSUFFICIENT_PERMISSIONS: {
    code: "INSUFFICIENT_PERMISSIONS",
    message: "Insufficient permissions for this action",
    userMessage: "You don't have permission to perform this action.",
  },
  ACCOUNT_SUSPENDED: {
    code: "ACCOUNT_SUSPENDED",
    message: "Account has been suspended",
    userMessage: "Your account has been suspended. Please contact support for assistance.",
  },
  
  // Rate limiting
  TOO_MANY_REQUESTS: {
    code: "TOO_MANY_REQUESTS",
    message: "Too many requests",
    userMessage: "Too many attempts. Please wait a moment before trying again.",
  },
  
  // OAuth errors
  OAUTH_ERROR: {
    code: "OAUTH_ERROR",
    message: "OAuth authentication failed",
    userMessage: "Authentication with the selected provider failed. Please try again.",
  },
  OAUTH_CANCELLED: {
    code: "OAUTH_CANCELLED",
    message: "OAuth authentication cancelled",
    userMessage: "Authentication was cancelled. You can try again if needed.",
  },
  
  // Password reset
  INVALID_RESET_TOKEN: {
    code: "INVALID_RESET_TOKEN",
    message: "Invalid or expired reset token",
    userMessage: "This password reset link is invalid or has expired. Please request a new one.",
  },
  
  // Generic fallback
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
    userMessage: "Something went wrong. Please try again or contact support if the problem persists.",
  },
} as const;

export type AuthErrorCode = keyof typeof AUTH_ERRORS;

/**
 * Custom authentication error class
 */
export class AuthError extends Error {
  public readonly code: AuthErrorCode;
  public readonly userMessage: string;
  public readonly statusCode: number;

  constructor(
    code: AuthErrorCode,
    statusCode: number = 400,
    originalError?: Error
  ) {
    const errorInfo = AUTH_ERRORS[code];
    super(errorInfo.message);
    
    this.name = "AuthError";
    this.code = code;
    this.userMessage = errorInfo.userMessage;
    this.statusCode = statusCode;
    
    // Preserve original error stack if available
    if (originalError) {
      this.stack = originalError.stack;
    }
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.userMessage,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Map Supabase auth errors to our custom error codes
 */
export function mapSupabaseAuthError(error: any): AuthError {
  const message = error?.message?.toLowerCase() || "";
  
  if (message.includes("invalid credentials") || message.includes("invalid login")) {
    return new AuthError("INVALID_CREDENTIALS", 401);
  }
  
  if (message.includes("user not found")) {
    return new AuthError("USER_NOT_FOUND", 404);
  }
  
  if (message.includes("password") && message.includes("weak")) {
    return new AuthError("WEAK_PASSWORD", 400);
  }
  
  if (message.includes("email") && message.includes("already")) {
    return new AuthError("EMAIL_ALREADY_REGISTERED", 409);
  }
  
  if (message.includes("email") && message.includes("confirm")) {
    return new AuthError("EMAIL_NOT_VERIFIED", 403);
  }
  
  if (message.includes("token") && (message.includes("expired") || message.includes("invalid"))) {
    return new AuthError("INVALID_RESET_TOKEN", 400);
  }
  
  if (message.includes("rate limit") || message.includes("too many")) {
    return new AuthError("TOO_MANY_REQUESTS", 429);
  }
  
  // Default to unknown error
  return new AuthError("UNKNOWN_ERROR", 500, error);
}

/**
 * Helper to create standardized error responses
 */
export function createErrorResponse(error: AuthError | AuthErrorCode, statusCode?: number) {
  if (typeof error === "string") {
    error = new AuthError(error, statusCode);
  }
  
  return {
    error: true,
    code: error.code,
    message: error.userMessage,
    statusCode: error.statusCode,
  };
}