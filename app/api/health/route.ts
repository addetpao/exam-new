import { NextRequest } from "next/server";
import { createSuccessResponse, createErrorResponse, handleAPIError } from "@/lib/server/utils/api-response";
import { createSupabaseAdmin } from "@/lib/server/db/supabase";
import { HealthCheckResponseSchema } from "@/lib/server/validation/schemas";

const startTime = Date.now();

/**
 * GET /api/health - System health check
 * Returns the overall health status of the ExamPrep platform
 */
export async function GET(request: NextRequest) {
  try {
    // Test database connectivity
    let databaseHealth: "healthy" | "unhealthy" = "healthy";
    let authHealth: "healthy" | "unhealthy" = "healthy";
    let storageHealth: "healthy" | "unhealthy" = "healthy";

    try {
      const supabase = createSupabaseAdmin();
      
      // Test database connection
      const { error: dbError } = await supabase
        .from("users")
        .select("count")
        .limit(1);
      
      if (dbError) {
        databaseHealth = "unhealthy";
      }

      // Test auth service
      const { error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      });
      
      if (authError) {
        authHealth = "unhealthy";
      }

      // Test storage service
      const { error: storageError } = await supabase.storage.listBuckets();
      
      if (storageError) {
        storageHealth = "unhealthy";
      }

    } catch (error) {
      console.error("Health check database test failed:", error);
      databaseHealth = "unhealthy";
    }

    const overallStatus = 
      databaseHealth === "healthy" && 
      authHealth === "healthy" && 
      storageHealth === "healthy" 
        ? "healthy" 
        : "unhealthy";

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      services: {
        database: databaseHealth,
        auth: authHealth,
        storage: storageHealth,
      },
      uptime: Math.floor((Date.now() - startTime) / 1000), // in seconds
    };

    // Validate response schema
    const validatedData = HealthCheckResponseSchema.parse(healthData);

    return createSuccessResponse(validatedData, overallStatus === "healthy" ? 200 : 503);

  } catch (error) {
    return handleAPIError(error);
  }
}

// Handle unsupported methods
export async function POST() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "POST method not allowed", null, 405);
}

export async function PUT() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "PUT method not allowed", null, 405);
}

export async function DELETE() {
  return createErrorResponse("METHOD_NOT_ALLOWED", "DELETE method not allowed", null, 405);
}