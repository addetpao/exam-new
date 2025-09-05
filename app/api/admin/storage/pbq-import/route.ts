// Admin PBQ import API endpoint
// Handles import of Performance-Based Question asset packages

import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { importPBQPackage } from "@/lib/server/storage/import-pbq";

// Validation schema for PBQ import request
const importSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
  version: z.string().min(1, "Version is required"),
  validateOnly: z.boolean().optional().default(false),
  allowOverwrite: z.boolean().optional().default(false),
  publishAfterImport: z.boolean().optional().default(false),
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

    // Check user role - only admins can import PBQ packages
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (userData.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can import PBQ packages" },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const packageFile = formData.get("package") as File;
    const questionId = formData.get("questionId") as string;
    const version = formData.get("version") as string;
    const validateOnly = formData.get("validateOnly") === "true";
    const allowOverwrite = formData.get("allowOverwrite") === "true";
    const publishAfterImport = formData.get("publishAfterImport") === "true";

    if (!packageFile) {
      return NextResponse.json(
        { error: "No package file provided" },
        { status: 400 }
      );
    }

    // Validate request parameters
    const validation = importSchema.safeParse({
      questionId,
      version,
      validateOnly,
      allowOverwrite,
      publishAfterImport,
    });

    if (!validation.success) {
      return NextResponse.json(
        { 
          error: "Invalid request parameters",
          details: validation.error.errors
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Convert package file to buffer and create import package
    const packageBuffer = Buffer.from(await packageFile.arrayBuffer());
    
    // For now, we'll expect individual files in the form data
    // In a real implementation, this would extract from a ZIP file
    const files: Array<{
      name: string;
      path: string;
      content: Buffer;
      mimeType: string;
    }> = [];

    // Extract individual files from form data
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File) {
        const fileName = value.name;
        const filePath = key.replace("file_", "");
        const content = Buffer.from(await value.arrayBuffer());
        
        files.push({
          name: fileName,
          path: filePath,
          content,
          mimeType: value.type,
        });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files found in package" },
        { status: 400 }
      );
    }

    // Create import package structure
    const importPackage = {
      questionId: validatedData.questionId,
      version: validatedData.version,
      files,
      metadata: {
        totalFiles: files.length,
        totalSize: files.reduce((sum, f) => sum + f.content.length, 0),
        packageHash: "hash-placeholder", // TODO: Calculate actual hash
      },
    };

    // Execute the import
    const importResult = await importPBQPackage(
      importPackage,
      user.id,
      {
        validateOnly: validatedData.validateOnly,
        allowOverwrite: validatedData.allowOverwrite,
        publishAfterImport: validatedData.publishAfterImport,
      }
    );

    // Log the import attempt for auditing
    await supabase.from("pbq_import_log").insert({
      user_id: user.id,
      question_id: validatedData.questionId,
      version: validatedData.version,
      success: importResult.success,
      validate_only: validatedData.validateOnly,
      allow_overwrite: validatedData.allowOverwrite,
      publish_after_import: validatedData.publishAfterImport,
      total_files: files.length,
      total_size: importPackage.metadata.totalSize,
      errors: importResult.errors,
      warnings: importResult.warnings,
      created_at: new Date().toISOString(),
    });

    // Return appropriate status code based on result
    if (importResult.success) {
      return NextResponse.json({
        success: true,
        result: importResult,
      });
    } else {
      return NextResponse.json({
        success: false,
        result: importResult,
      }, { 
        status: importResult.rollbackRequired ? 500 : 400 
      });
    }

  } catch (error) {
    console.error("PBQ import error:", error);
    
    if (error instanceof Error && "statusCode" in error) {
      return NextResponse.json(
        { error: error.message },
        { status: (error as any).statusCode }
      );
    }

    return NextResponse.json(
      { 
        error: "Internal server error during PBQ import",
        details: error instanceof Error ? error.message : "Unknown error"
      },
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