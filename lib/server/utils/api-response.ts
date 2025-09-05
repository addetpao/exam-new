import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

export interface APIResponse<T = any> {
  data?: T;
  error?: APIError;
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse<APIResponse<T>> {
  return NextResponse.json({
    data,
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  status: number = 400
): NextResponse<APIResponse> {
  return NextResponse.json({
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString()
  }, { status });
}

/**
 * Handle common errors with appropriate status codes
 */
export function handleAPIError(error: unknown): NextResponse<APIResponse> {
  console.error("API Error:", error);

  if (error instanceof ZodError) {
    return createErrorResponse(
      "VALIDATION_ERROR",
      "Request validation failed",
      error.errors,
      400
    );
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes("not found")) {
      return createErrorResponse("NOT_FOUND", error.message, null, 404);
    }
    
    if (error.message.includes("unauthorized")) {
      return createErrorResponse("UNAUTHORIZED", error.message, null, 401);
    }

    if (error.message.includes("forbidden")) {
      return createErrorResponse("FORBIDDEN", error.message, null, 403);
    }

    return createErrorResponse("INTERNAL_ERROR", error.message, null, 500);
  }

  return createErrorResponse(
    "UNKNOWN_ERROR",
    "An unexpected error occurred",
    null,
    500
  );
}

/**
 * HTTP method validation middleware
 */
export function validateMethod(request: Request, allowedMethods: string[]): NextResponse<APIResponse> | null {
  if (!allowedMethods.includes(request.method)) {
    return createErrorResponse(
      "METHOD_NOT_ALLOWED",
      `Method ${request.method} not allowed. Allowed methods: ${allowedMethods.join(", ")}`,
      null,
      405
    );
  }
  return null;
}