// Bucket management for ExamPrep platform storage
// Handles bucket creation, policy setup, and configuration

import { createSupabaseAdmin } from "../db/supabase";
import type { StorageBucket } from "./types";

interface BucketConfig {
  id: string;
  name: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

interface PolicyConfig {
  name: string;
  bucket_id: string;
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  definition: string;
  check?: string;
}

/**
 * Bucket configurations for the ExamPrep platform
 */
export const BUCKET_CONFIGS: Record<StorageBucket, BucketConfig> = {
  "pbq-assets": {
    id: "pbq-assets",
    name: "pbq-assets",
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "application/json",
      "text/plain",
    ],
  },
  "content-media": {
    id: "content-media", 
    name: "content-media",
    public: true,
    fileSizeLimit: 104857600, // 100MB
    allowedMimeTypes: [
      "image/png",
      "image/jpeg", 
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "video/mp4",
      "application/pdf",
    ],
  },
  "temp-uploads": {
    id: "temp-uploads",
    name: "temp-uploads", 
    public: false,
    fileSizeLimit: 209715200, // 200MB
    allowedMimeTypes: [
      "image/png",
      "image/jpeg",
      "image/gif", 
      "image/webp",
      "application/json",
      "application/zip",
      "text/plain",
      "text/csv",
    ],
  },
};

/**
 * Storage policies for bucket access control
 */
export const STORAGE_POLICIES: PolicyConfig[] = [
  // PBQ Assets Policies
  {
    name: "Public read access for PBQ assets",
    bucket_id: "pbq-assets",
    operation: "SELECT",
    definition: "bucket_id = 'pbq-assets'",
  },
  {
    name: "Content editors can upload PBQ assets", 
    bucket_id: "pbq-assets",
    operation: "INSERT",
    definition: "",
    check: `
      bucket_id = 'pbq-assets'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
      )
    `,
  },
  {
    name: "Admins can update PBQ assets",
    bucket_id: "pbq-assets", 
    operation: "UPDATE",
    definition: `
      bucket_id = 'pbq-assets'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    `,
  },
  {
    name: "Admins can delete PBQ assets",
    bucket_id: "pbq-assets",
    operation: "DELETE", 
    definition: `
      bucket_id = 'pbq-assets'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
      AND NOT (name LIKE '%/published/%')
    `,
  },

  // Content Media Policies
  {
    name: "Public read access for content media",
    bucket_id: "content-media",
    operation: "SELECT",
    definition: "bucket_id = 'content-media'",
  },
  {
    name: "Content editors can upload content media",
    bucket_id: "content-media", 
    operation: "INSERT",
    definition: "",
    check: `
      bucket_id = 'content-media'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
      )
    `,
  },
  {
    name: "Content editors can update content media",
    bucket_id: "content-media",
    operation: "UPDATE", 
    definition: `
      bucket_id = 'content-media'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'content_editor')
      )
    `,
  },
  {
    name: "Admins can delete content media",
    bucket_id: "content-media",
    operation: "DELETE",
    definition: `
      bucket_id = 'content-media'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    `,
  },

  // Temp Uploads Policies  
  {
    name: "Users can access own temp uploads",
    bucket_id: "temp-uploads",
    operation: "SELECT",
    definition: `
      bucket_id = 'temp-uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    `,
  },
  {
    name: "Users can upload to own temp folder",
    bucket_id: "temp-uploads",
    operation: "INSERT",
    definition: "",
    check: `
      bucket_id = 'temp-uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    `,
  },
  {
    name: "Users can update own temp uploads",
    bucket_id: "temp-uploads", 
    operation: "UPDATE",
    definition: `
      bucket_id = 'temp-uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    `,
  },
  {
    name: "Users can delete own temp uploads",
    bucket_id: "temp-uploads",
    operation: "DELETE",
    definition: `
      bucket_id = 'temp-uploads'
      AND auth.uid()::text = (storage.foldername(name))[1]
    `,
  },
  {
    name: "Admins have full access to temp uploads",
    bucket_id: "temp-uploads",
    operation: "SELECT",
    definition: `
      bucket_id = 'temp-uploads'
      AND EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'admin'
      )
    `,
  },
];

/**
 * Create a storage bucket if it doesn't exist
 */
export async function createBucket(bucketId: StorageBucket): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const config = BUCKET_CONFIGS[bucketId];

  try {
    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error(`Error listing buckets: ${listError.message}`);
      return false;
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.id === bucketId);
    
    if (bucketExists) {
      console.log(`Bucket ${bucketId} already exists`);
      return true;
    }

    // Create the bucket
    const { data, error } = await supabase.storage.createBucket(bucketId, {
      public: config.public,
      fileSizeLimit: config.fileSizeLimit,
      allowedMimeTypes: config.allowedMimeTypes,
    });

    if (error) {
      console.error(`Failed to create bucket ${bucketId}: ${error.message}`);
      return false;
    }

    console.log(`Successfully created bucket: ${bucketId}`);
    return true;

  } catch (error) {
    console.error(`Unexpected error creating bucket ${bucketId}:`, error);
    return false;
  }
}

/**
 * Create all storage buckets for the platform
 */
export async function createAllBuckets(): Promise<{
  success: boolean;
  created: string[];
  failed: string[];
}> {
  const created: string[] = [];
  const failed: string[] = [];

  console.log("🪣 Creating storage buckets...");

  for (const bucketId of Object.keys(BUCKET_CONFIGS) as StorageBucket[]) {
    const success = await createBucket(bucketId);
    
    if (success) {
      created.push(bucketId);
    } else {
      failed.push(bucketId);
    }
  }

  const success = failed.length === 0;
  
  console.log(`📊 Bucket creation summary:`);
  console.log(`  ✅ Created: ${created.join(", ")}`);
  if (failed.length > 0) {
    console.log(`  ❌ Failed: ${failed.join(", ")}`);
  }

  return { success, created, failed };
}

/**
 * Verify that all required buckets exist and are properly configured
 */
export async function verifyBuckets(): Promise<{
  allExists: boolean;
  status: Record<StorageBucket, boolean>;
  details: Array<{
    bucket: StorageBucket;
    exists: boolean;
    config?: any;
    error?: string;
  }>;
}> {
  const supabase = createSupabaseAdmin();
  const status: Record<StorageBucket, boolean> = {} as any;
  const details: Array<{
    bucket: StorageBucket;
    exists: boolean;
    config?: any;
    error?: string;
  }> = [];

  console.log("🔍 Verifying storage buckets...");

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(`Failed to list buckets: ${error.message}`);
    }

    for (const bucketId of Object.keys(BUCKET_CONFIGS) as StorageBucket[]) {
      const bucket = buckets?.find(b => b.id === bucketId);
      const exists = !!bucket;
      
      status[bucketId] = exists;
      details.push({
        bucket: bucketId,
        exists,
        config: bucket ? {
          public: bucket.public,
          fileSizeLimit: bucket.file_size_limit,
          allowedMimeTypes: bucket.allowed_mime_types,
        } : undefined,
        error: !exists ? "Bucket does not exist" : undefined,
      });

      console.log(`  ${exists ? "✅" : "❌"} ${bucketId}: ${exists ? "EXISTS" : "MISSING"}`);
    }

    const allExists = Object.values(status).every(exists => exists);
    return { allExists, status, details };

  } catch (error) {
    console.error("Error verifying buckets:", error);
    
    // Return default failed status for all buckets
    for (const bucketId of Object.keys(BUCKET_CONFIGS) as StorageBucket[]) {
      status[bucketId] = false;
      details.push({
        bucket: bucketId,
        exists: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }

    return { allExists: false, status, details };
  }
}

/**
 * Get bucket configuration for a specific bucket
 */
export function getBucketConfig(bucketId: StorageBucket): BucketConfig {
  return BUCKET_CONFIGS[bucketId];
}

/**
 * Get all bucket configurations
 */
export function getAllBucketConfigs(): Record<StorageBucket, BucketConfig> {
  return BUCKET_CONFIGS;
}

/**
 * Check if a MIME type is allowed for a specific bucket
 */
export function isMimeTypeAllowed(bucketId: StorageBucket, mimeType: string): boolean {
  const config = BUCKET_CONFIGS[bucketId];
  return config.allowedMimeTypes.includes(mimeType);
}

/**
 * Get the file size limit for a specific bucket
 */
export function getFileSizeLimit(bucketId: StorageBucket): number {
  return BUCKET_CONFIGS[bucketId].fileSizeLimit;
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}