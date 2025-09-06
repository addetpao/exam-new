// Storage helpers for ExamPrep platform
// Provides typed utilities for asset management with Supabase Storage

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import type {
  StorageBucket,
  MimeType,
  AssetMetadata,
  UploadOptions,
  SignedUrlOptions,
  StorageError,
  AssetValidationResult,
} from "./types";
import { FOLDER_STRUCTURE, FILE_LIMITS, CACHE_CONTROL } from "./types";

// Initialize Supabase client for storage operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables for storage operations"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Upload a file to Supabase Storage
 */
export async function putAsset(options: UploadOptions): Promise<AssetMetadata> {
  try {
    const { bucket, path, file, metadata = {} } = options;

    // Validate file size
    const fileSize = file instanceof File ? file.size : file.length;
    const sizeLimit = getSizeLimit(bucket);

    if (fileSize > sizeLimit) {
      throw new StorageException(
        `File size ${fileSize} exceeds limit ${sizeLimit} for bucket ${bucket}`,
        "FILE_TOO_LARGE",
        413
      );
    }

    // Validate file type
    const mimeType =
      file instanceof File
        ? (file.type as MimeType)
        : (metadata.contentType as MimeType);
    const validationResult = await validateAsset(file, mimeType);

    if (!validationResult.valid) {
      throw new StorageException(
        `Invalid file: ${validationResult.errors.join(", ")}`,
        "INVALID_FILE",
        400
      );
    }

    // Generate checksum
    const buffer =
      file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // Set appropriate cache control
    const cacheControl = getCacheControl(bucket, path);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        cacheControl,
        contentType: mimeType,
        upsert: metadata.upsert || false,
      });

    if (error) {
      throw new StorageException(
        `Failed to upload asset: ${error.message}`,
        "UPLOAD_FAILED",
        500,
        error
      );
    }

    return {
      id: data.id || path,
      bucket,
      path: data.path || path,
      name: path.split("/").pop() || path,
      mimeType,
      size: fileSize,
      checksum,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "system", // TODO: Get from auth context
    };
  } catch (error) {
    if (error instanceof StorageException) {
      throw error;
    }
    throw new StorageException(
      `Unexpected error during upload: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

/**
 * Get public URL for a storage object
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Generate a signed URL for temporary access
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  options: SignedUrlOptions = {}
): Promise<string> {
  try {
    const { expiresIn = 3600, download = false, transform } = options;

    const signOptions: any = { expiresIn };

    if (download) {
      signOptions.download = true;
    }

    if (transform) {
      signOptions.transform = transform;
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn, signOptions);

    if (error) {
      throw new StorageError(
        `Failed to generate signed URL: ${error.message}`,
        "SIGNED_URL_FAILED",
        500,
        error
      );
    }

    return data.signedUrl;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error generating signed URL: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

/**
 * Check if a storage object exists
 */
export async function exists(
  bucket: StorageBucket,
  path: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path.split("/").slice(0, -1).join("/"), {
        search: path.split("/").pop(),
      });

    if (error) {
      return false;
    }

    return data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Delete a storage object
 */
export async function deleteAsset(
  bucket: StorageBucket,
  path: string
): Promise<void> {
  try {
    // Safety check: prevent deletion of published assets
    if (bucket === "pbq-assets" && path.includes("/published/")) {
      throw new StorageError(
        "Cannot delete published PBQ assets",
        "DELETE_FORBIDDEN",
        403
      );
    }

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new StorageError(
        `Failed to delete asset: ${error.message}`,
        "DELETE_FAILED",
        500,
        error
      );
    }
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error during deletion: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

/**
 * List objects in a storage bucket folder
 */
export async function listAssets(
  bucket: StorageBucket,
  path: string = "",
  limit: number = 100
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, { limit, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      throw new StorageError(
        `Failed to list assets: ${error.message}`,
        "LIST_FAILED",
        500,
        error
      );
    }

    return data || [];
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      `Unexpected error listing assets: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      500,
      error
    );
  }
}

/**
 * Validate an asset before upload
 */
export async function validateAsset(
  file: File | Buffer,
  mimeType: MimeType
): Promise<AssetValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Basic MIME type validation
    const allowedTypes: MimeType[] = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/json",
      "text/plain",
      "text/csv",
      "application/pdf",
      "video/mp4",
      "application/zip",
    ];

    if (!allowedTypes.includes(mimeType)) {
      errors.push(`Unsupported MIME type: ${mimeType}`);
    }

    // File size validation
    const fileSize = file instanceof File ? file.size : file.length;
    if (fileSize === 0) {
      errors.push("File is empty");
    }

    // Image-specific validation
    if (mimeType.startsWith("image/")) {
      try {
        // For images, we could add dimension validation here
        // This would require an image processing library like sharp
        warnings.push("Image validation requires additional setup");
      } catch {
        warnings.push("Could not validate image dimensions");
      }
    }

    // JSON validation for config files
    if (mimeType === "application/json") {
      try {
        const content =
          file instanceof File ? await file.text() : file.toString("utf8");
        JSON.parse(content);
      } catch {
        errors.push("Invalid JSON format");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        mimeType,
        size: fileSize,
      },
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      warnings,
    };
  }
}

/**
 * Generate versioned asset path for PBQ assets
 */
export function generateVersionedPath(
  questionId: string,
  fileName: string,
  version: string = "draft"
): string {
  const timestamp = Date.now();
  const extension = fileName.split(".").pop();
  const name = fileName.replace(`.${extension}`, "");

  if (version === "published") {
    return (
      FOLDER_STRUCTURE.PBQ_ASSETS.PUBLISHED(questionId) +
      `/${name}.${extension}`
    );
  }

  return (
    FOLDER_STRUCTURE.PBQ_ASSETS.QUESTION(questionId, version) +
    `/${name}_${timestamp}.${extension}`
  );
}

/**
 * Get appropriate cache control header
 */
function getCacheControl(bucket: StorageBucket, path: string): string {
  if (bucket === "temp-uploads") {
    return CACHE_CONTROL.PRIVATE_TEMP;
  }

  if (bucket === "pbq-assets" && path.includes("/published/")) {
    return CACHE_CONTROL.PUBLIC_ASSETS;
  }

  return CACHE_CONTROL.CONTENT_MEDIA;
}

/**
 * Get file size limit for bucket
 */
function getSizeLimit(bucket: StorageBucket): number {
  switch (bucket) {
    case "pbq-assets":
      return FILE_LIMITS.PBQ_ASSET;
    case "content-media":
      return FILE_LIMITS.CONTENT_MEDIA;
    case "temp-uploads":
      return FILE_LIMITS.TEMP_UPLOAD;
    default:
      return FILE_LIMITS.PBQ_ASSET;
  }
}

/**
 * Custom StorageError class
 */
class StorageException extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "StorageError";
  }
}
