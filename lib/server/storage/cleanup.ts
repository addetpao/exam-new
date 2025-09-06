// Storage cleanup utilities for ExamPrep platform
// Handles cleanup of temporary uploads and expired assets

import { createClient } from "@supabase/supabase-js";
import { listAssets, deleteAsset } from "./helpers";
import { StorageBucket, CleanupJobResult } from "./types";

// Initialize Supabase client for cleanup operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase environment variables for cleanup operations"
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Clean up expired temporary uploads (older than 24 hours)
 */
export async function cleanupExpiredTempUploads(): Promise<CleanupJobResult> {
  const startTime = Date.now();
  const result: CleanupJobResult = {
    processed: 0,
    deleted: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log("Starting cleanup of expired temp uploads...");

    // Get all files in temp-uploads bucket
    const files = await listAssets("temp-uploads", "", 1000);
    result.processed = files.length;

    if (files.length === 0) {
      console.log("No temp uploads found for cleanup");
      result.duration = Date.now() - startTime;
      return result;
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const file of files) {
      try {
        // Check if file is older than 24 hours
        const fileCreatedAt = new Date(file.created_at);

        if (fileCreatedAt < twentyFourHoursAgo) {
          await deleteAsset("temp-uploads", file.name);
          result.deleted++;
          console.log(`Deleted expired temp upload: ${file.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push({
          path: file.name,
          error: errorMessage,
        });
        console.error(`Failed to delete ${file.name}: ${errorMessage}`);
      }
    }

    console.log(
      `Cleanup completed: ${result.deleted} files deleted, ${result.errors.length} errors`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push({
      path: "temp-uploads",
      error: `Failed to list temp uploads: ${errorMessage}`,
    });
    console.error("Cleanup failed:", errorMessage);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Clean up orphaned assets (assets without corresponding database records)
 */
export async function cleanupOrphanedAssets(
  bucket: StorageBucket
): Promise<CleanupJobResult> {
  const startTime = Date.now();
  const result: CleanupJobResult = {
    processed: 0,
    deleted: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log(`Starting cleanup of orphaned assets in ${bucket}...`);

    // Get all files in the bucket
    const files = await listAssets(bucket, "", 1000);
    result.processed = files.length;

    if (files.length === 0) {
      console.log(`No files found in ${bucket} for cleanup`);
      result.duration = Date.now() - startTime;
      return result;
    }

    // For PBQ assets, check against questions table
    if (bucket === "pbq-assets") {
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("id");

      if (questionsError) {
        result.errors.push({
          path: bucket,
          error: `Failed to fetch questions: ${questionsError.message}`,
        });
        result.duration = Date.now() - startTime;
        return result;
      }

      const questionIds = new Set(questions?.map((q) => q.id) || []);

      for (const file of files) {
        try {
          // Extract question ID from path (format: pbq/{questionId}/...)
          const pathSegments = file.name.split("/");
          if (pathSegments.length >= 2 && pathSegments[0] === "pbq") {
            const questionId = pathSegments[1];

            // Skip published assets (never delete published content)
            if (file.name.includes("/published/")) {
              continue;
            }

            // If question doesn't exist, mark as orphaned
            if (!questionIds.has(questionId)) {
              await deleteAsset(bucket, file.name);
              result.deleted++;
              console.log(`Deleted orphaned PBQ asset: ${file.name}`);
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            path: file.name,
            error: errorMessage,
          });
          console.error(`Failed to delete ${file.name}: ${errorMessage}`);
        }
      }
    }

    // For content-media, check against posts table
    if (bucket === "content-media") {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id");

      if (postsError) {
        result.errors.push({
          path: bucket,
          error: `Failed to fetch posts: ${postsError.message}`,
        });
        result.duration = Date.now() - startTime;
        return result;
      }

      const postIds = new Set(posts?.map((p) => p.id) || []);

      for (const file of files) {
        try {
          // Extract post ID from path (format: content/posts/{postId}/...)
          const pathSegments = file.name.split("/");
          if (
            pathSegments.length >= 3 &&
            pathSegments[0] === "content" &&
            pathSegments[1] === "posts"
          ) {
            const postId = pathSegments[2];

            // If post doesn't exist, mark as orphaned
            if (!postIds.has(postId)) {
              await deleteAsset(bucket, file.name);
              result.deleted++;
              console.log(`Deleted orphaned content media: ${file.name}`);
            }
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          result.errors.push({
            path: file.name,
            error: errorMessage,
          });
          console.error(`Failed to delete ${file.name}: ${errorMessage}`);
        }
      }
    }

    console.log(
      `Orphaned assets cleanup completed: ${result.deleted} files deleted, ${result.errors.length} errors`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push({
      path: bucket,
      error: `Orphaned assets cleanup failed: ${errorMessage}`,
    });
    console.error("Orphaned assets cleanup failed:", errorMessage);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Clean up draft versions older than 30 days (keeping only latest 5 drafts)
 */
export async function cleanupOldDraftVersions(): Promise<CleanupJobResult> {
  const startTime = Date.now();
  const result: CleanupJobResult = {
    processed: 0,
    deleted: 0,
    errors: [],
    duration: 0,
  };

  try {
    console.log("Starting cleanup of old draft versions...");

    // Get all draft folders in PBQ assets
    const files = await listAssets("pbq-assets", "pbq", 1000);

    // Group files by question ID
    const questionGroups = new Map<
      string,
      Array<{ name: string; created_at: string }>
    >();

    for (const file of files) {
      const pathSegments = file.name.split("/");
      if (pathSegments.length >= 3 && pathSegments[0] === "pbq") {
        const questionId = pathSegments[1];
        const version = pathSegments[2];

        // Skip published versions
        if (version === "published") {
          continue;
        }

        if (!questionGroups.has(questionId)) {
          questionGroups.set(questionId, []);
        }

        questionGroups.get(questionId)!.push({
          name: file.name,
          created_at: file.created_at,
        });
      }
    }

    result.processed = Array.from(questionGroups.values()).reduce(
      (sum, files) => sum + files.length,
      0
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Process each question group
    for (const [questionId, questionFiles] of questionGroups) {
      try {
        // Sort by creation date (newest first)
        questionFiles.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        // Keep the latest 5 drafts, delete older ones if they're over 30 days old
        const filesToDelete = questionFiles
          .slice(5) // Skip the latest 5
          .filter((file) => new Date(file.created_at) < thirtyDaysAgo);

        for (const file of filesToDelete) {
          await deleteAsset("pbq-assets", file.name);
          result.deleted++;
          console.log(`Deleted old draft version: ${file.name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        result.errors.push({
          path: questionId,
          error: errorMessage,
        });
        console.error(
          `Failed to cleanup drafts for question ${questionId}: ${errorMessage}`
        );
      }
    }

    console.log(
      `Draft versions cleanup completed: ${result.deleted} files deleted, ${result.errors.length} errors`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result.errors.push({
      path: "pbq-assets",
      error: `Draft versions cleanup failed: ${errorMessage}`,
    });
    console.error("Draft versions cleanup failed:", errorMessage);
  }

  result.duration = Date.now() - startTime;
  return result;
}

/**
 * Run all cleanup jobs in sequence
 */
export async function runAllCleanupJobs(): Promise<{
  success: boolean;
  results: {
    tempUploads: CleanupJobResult;
    orphanedPBQAssets: CleanupJobResult;
    orphanedContentMedia: CleanupJobResult;
    oldDraftVersions: CleanupJobResult;
  };
  totalDuration: number;
}> {
  const startTime = Date.now();

  console.log("Starting comprehensive storage cleanup...");

  const results = {
    tempUploads: await cleanupExpiredTempUploads(),
    orphanedPBQAssets: await cleanupOrphanedAssets("pbq-assets"),
    orphanedContentMedia: await cleanupOrphanedAssets("content-media"),
    oldDraftVersions: await cleanupOldDraftVersions(),
  };

  const totalDuration = Date.now() - startTime;
  const totalDeleted = Object.values(results).reduce(
    (sum, result) => sum + result.deleted,
    0
  );
  const totalErrors = Object.values(results).reduce(
    (sum, result) => sum + result.errors.length,
    0
  );
  const success = totalErrors === 0;

  console.log(`Storage cleanup completed in ${totalDuration}ms:`);
  console.log(`- Total files deleted: ${totalDeleted}`);
  console.log(`- Total errors: ${totalErrors}`);
  console.log(`- Success: ${success}`);

  return {
    success,
    results,
    totalDuration,
  };
}

/**
 * Log cleanup job results to database
 */
export async function logCleanupResult(
  jobType: string,
  result: CleanupJobResult,
  userId?: string
): Promise<void> {
  try {
    await supabase.from("storage_cleanup_log").insert({
      job_type: jobType,
      user_id: userId || null,
      processed: result.processed,
      deleted: result.deleted,
      errors_count: result.errors.length,
      errors_details:
        result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      duration_ms: result.duration,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to log cleanup result:", error);
    // Don't throw - logging failures shouldn't break cleanup
  }
}
