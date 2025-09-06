import { FullConfig } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

async function globalTeardown(config: FullConfig) {
  console.log("🧹 Starting global E2E test teardown...");

  // Clean up test database
  if (process.env.TEST_SUPABASE_URL && process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
    await cleanupTestDatabase();
  }

  // Clean up authentication state files
  await cleanupAuthenticationStates();

  // Clean up test artifacts if not in CI (for debugging)
  if (!process.env.CI) {
    await cleanupTestArtifacts();
  }

  console.log("✅ Global E2E test teardown completed");
}

async function cleanupTestDatabase() {
  console.log("🗄️ Cleaning up test database...");

  const supabase = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Clean up test data in reverse dependency order
    await supabase.from("user_answers").delete().neq("id", "");
    await supabase.from("exam_attempts").delete().neq("id", "");
    await supabase.from("user_progress").delete().neq("id", "");
    await supabase.from("choices").delete().like("id", "test-%");
    await supabase.from("questions").delete().like("id", "test-%");
    await supabase.from("subscriptions").delete().like("user_id", "test-%");
    await supabase.from("users").delete().like("id", "test-%");

    console.log("✅ Test database cleanup completed");
  } catch (error) {
    console.warn("⚠️ Test database cleanup failed:", error);
    // Don't throw error as this shouldn't fail the entire test suite
  }
}

async function cleanupAuthenticationStates() {
  console.log("🔐 Cleaning up authentication state files...");

  const authDir = path.join(process.cwd(), "tests", "e2e", "auth");
  const authFiles = [
    "standard-user.json",
    "premium-user.json", 
    "admin-user.json",
  ];

  try {
    // Create auth directory if it doesn't exist
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }

    // Remove auth state files
    for (const file of authFiles) {
      const filePath = path.join(authDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    console.log("✅ Authentication state files cleaned up");
  } catch (error) {
    console.warn("⚠️ Authentication state cleanup failed:", error);
  }
}

async function cleanupTestArtifacts() {
  console.log("📁 Cleaning up old test artifacts...");

  try {
    const testResultsDir = path.join(process.cwd(), "test-results");
    
    if (fs.existsSync(testResultsDir)) {
      // Keep only the most recent test results
      const subdirs = fs.readdirSync(testResultsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => ({
          name: dirent.name,
          path: path.join(testResultsDir, dirent.name),
          mtime: fs.statSync(path.join(testResultsDir, dirent.name)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep the 3 most recent directories, remove older ones
      const dirsToRemove = subdirs.slice(3);
      
      for (const dir of dirsToRemove) {
        fs.rmSync(dir.path, { recursive: true, force: true });
        console.log(`🗑️ Removed old test artifacts: ${dir.name}`);
      }
    }

    console.log("✅ Test artifacts cleanup completed");
  } catch (error) {
    console.warn("⚠️ Test artifacts cleanup failed:", error);
  }
}

export default globalTeardown;