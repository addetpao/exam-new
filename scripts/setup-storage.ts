#!/usr/bin/env tsx
// Setup script for ExamPrep platform storage
// Creates and configures Supabase storage buckets

// Note: Environment variables should be loaded from .env.local via Next.js or set manually

import { createAllBuckets, verifyBuckets } from "../lib/server/storage/buckets";

async function setupStorage() {
  console.log("🎯 Storage Manager Agent: Setting up ExamPrep platform storage");
  console.log("=====================================");
  
  try {
    // Verify environment variables
    console.log("🔍 Checking environment variables...");
    
    const requiredEnvVars = [
      "NEXT_PUBLIC_SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY"
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error("❌ Missing required environment variables:");
      missingVars.forEach(varName => console.error(`  - ${varName}`));
      process.exit(1);
    }

    console.log("✅ Environment variables OK");
    console.log("");

    // Step 1: Verify existing buckets
    console.log("📋 Step 1: Verifying existing buckets...");
    const initialVerification = await verifyBuckets();
    
    if (initialVerification.allExists) {
      console.log("✅ All buckets already exist!");
      console.log("");
      displayBucketStatus(initialVerification.details);
      console.log("🎉 Storage setup complete - all buckets are ready!");
      process.exit(0);
    }

    console.log("📝 Some buckets need to be created...");
    displayBucketStatus(initialVerification.details);
    console.log("");

    // Step 2: Create missing buckets
    console.log("📋 Step 2: Creating storage buckets...");
    const creationResult = await createAllBuckets();

    if (!creationResult.success) {
      console.error("❌ Failed to create some buckets:");
      creationResult.failed.forEach(bucket => console.error(`  - ${bucket}`));
      process.exit(1);
    }

    console.log("✅ All buckets created successfully!");
    console.log("");

    // Step 3: Final verification
    console.log("📋 Step 3: Final verification...");
    const finalVerification = await verifyBuckets();

    if (!finalVerification.allExists) {
      console.error("❌ Some buckets are still missing after creation:");
      finalVerification.details
        .filter(detail => !detail.exists)
        .forEach(detail => console.error(`  - ${detail.bucket}: ${detail.error}`));
      process.exit(1);
    }

    console.log("✅ All buckets verified successfully!");
    console.log("");
    displayBucketStatus(finalVerification.details);

    console.log("");
    console.log("🎉 Storage setup complete!");
    console.log("📊 Summary:");
    console.log(`  - Created buckets: ${creationResult.created.length}`);
    console.log(`  - Failed buckets: ${creationResult.failed.length}`);
    console.log("");
    console.log("🚀 Storage is ready for ExamPrep platform!");

  } catch (error) {
    console.error("💥 Unexpected error during storage setup:", error);
    process.exit(1);
  }
}

function displayBucketStatus(details: Array<{
  bucket: string;
  exists: boolean;
  config?: any;
  error?: string;
}>) {
  console.log("📊 Bucket Status:");
  details.forEach(detail => {
    const status = detail.exists ? "✅ EXISTS" : "❌ MISSING";
    console.log(`  ${status} ${detail.bucket}`);
    
    if (detail.exists && detail.config) {
      console.log(`    - Public: ${detail.config.public}`);
      console.log(`    - Size limit: ${formatFileSize(detail.config.fileSizeLimit)}`);
      console.log(`    - MIME types: ${detail.config.allowedMimeTypes?.length || 0} allowed`);
    }
    
    if (detail.error) {
      console.log(`    - Error: ${detail.error}`);
    }
  });
}

function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Execute setup if this script is run directly
if (require.main === module) {
  setupStorage().catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}