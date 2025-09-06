// Admin storage upload API endpoint
// Handles file uploads to Supabase Storage with RBAC validation

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { putAsset, validateAsset } from "@/lib/server/storage/helpers";
import { StorageBucket, MimeType } from "@/lib/server/storage/types";

// Validation schema for upload request
const uploadSchema = z.object({
  bucket: z.enum(["pbq-assets", "content-media", "temp-uploads"]),
  path: z.string().min(1, "Path is required"),
  metadata: z
    .object({
      cacheControl: z.string().optional(),
      contentType: z.string().optional(),
      upsert: z.boolean().optional(),
    })
    .optional(),
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("app_role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only content editors and admins can upload
    if (!["content_editor", "admin"].includes((userData as any).app_role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const bucket = formData.get("bucket") as StorageBucket;
    const path = formData.get("path") as string;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate request parameters
    const validation = uploadSchema.safeParse({
      bucket,
      path,
      metadata: metadataStr ? JSON.parse(metadataStr) : undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const { bucket: validBucket, path: validPath, metadata } = validation.data;

    // Additional permission checks for specific buckets
    if (
      validBucket === "pbq-assets" &&
      (userData as any).app_role !== "admin"
    ) {
      // Only admins can upload to PBQ assets in production
      if (validPath.includes("/published/")) {
        return NextResponse.json(
          { error: "Only admins can upload to published PBQ assets" },
          { status: 403 }
        );
      }
    }

    // Upload the file
    const assetMetadata = await putAsset({
      bucket: validBucket,
      path: validPath,
      file,
      metadata: {
        ...metadata,
        contentType: file.type as MimeType,
      },
    });

    // Log the upload for auditing
    await supabase.from("storage_audit_log").insert({
      user_id: user.id,
      action: "upload",
      bucket: validBucket,
      path: validPath,
      file_size: assetMetadata.size,
      mime_type: assetMetadata.mimeType,
      checksum: assetMetadata.checksum,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      asset: assetMetadata,
    });
  } catch (error) {
    console.error("Storage upload error:", error);

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
