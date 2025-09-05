// Public storage signed URL API endpoint
// Generates signed URLs for temporary access to private storage objects

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSignedUrl, exists } from "@/lib/server/storage/helpers";
import { StorageBucket } from "@/lib/server/storage/types";

// Validation schema for signed URL request
const signedUrlSchema = z.object({
  bucket: z.enum(["pbq-assets", "content-media", "temp-uploads"]),
  path: z.string().min(1, "Path is required"),
  expiresIn: z.number().min(60).max(86400).optional().default(3600), // 1 minute to 24 hours
  download: z.boolean().optional().default(false),
  transform: z.object({
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    format: z.enum(["webp", "png", "jpeg"]).optional(),
    quality: z.number().min(1).max(100).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = signedUrlSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters",
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const { bucket, path, expiresIn, download, transform } = validation.data;

    // Check if the object exists
    const objectExists = await exists(bucket, path);
    if (!objectExists) {
      return NextResponse.json(
        { error: "Object not found" },
        { status: 404 }
      );
    }

    // Permission checks for different buckets
    if (bucket === "temp-uploads") {
      // Users can only access their own temp uploads
      const userId = user.id;
      const pathSegments = path.split("/");
      
      if (pathSegments[0] !== userId) {
        return NextResponse.json(
          { error: "Access denied to this temp upload" },
          { status: 403 }
        );
      }
    } else if (bucket === "pbq-assets" || bucket === "content-media") {
      // Check if user has appropriate role for non-public assets
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("app_role")
        .eq("id", user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        );
      }

      // For draft/non-published assets, require content editor or admin role
      if (!path.includes("/published/") && !["content_editor", "admin"].includes((userData as any).app_role)) {
        return NextResponse.json(
          { error: "Insufficient permissions for this asset" },
          { status: 403 }
        );
      }
    }

    // Generate the signed URL
    const signedUrl = await getSignedUrl(bucket, path, {
      expiresIn,
      download,
      transform,
    });

    // Log the signed URL generation for auditing (optional)
    await supabase.from("storage_access_log").insert({
      user_id: user.id,
      bucket,
      path,
      action: "signed_url_generated",
      expires_in: expiresIn,
      download_requested: download,
      transform_options: transform ? JSON.stringify(transform) : null,
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Ignore logging errors - don't fail the request
      console.warn("Failed to log signed URL generation");
    });

    return NextResponse.json({
      success: true,
      signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

  } catch (error) {
    console.error("Signed URL generation error:", error);
    
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as any).statusCode }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
