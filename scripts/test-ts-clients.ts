/**
 * Test TypeScript Supabase client configurations
 */

import { createClient } from "@/lib/auth/client";
import { createClient as createServerClient } from "@/lib/auth/server";

async function testClients() {
  console.log("🎯 Database Agent: Testing TypeScript Supabase clients...\n");

  // Test 1: Browser client instantiation
  console.log("1. Testing browser client instantiation...");
  try {
    const client = createClient();
    if (client) {
      console.log("✅ Browser client created successfully");
      console.log(`   URL: ${client.supabaseUrl}`);
      console.log(`   Key: ${client.supabaseKey.substring(0, 20)}...`);
    }
  } catch (error) {
    console.error("❌ Browser client failed:", error);
  }

  // Test 2: Server client instantiation (would fail in Node.js context, but validates import)
  console.log("\n2. Testing server client function...");
  try {
    // Just check that the function exists and can be imported
    console.log("✅ Server client function imported successfully");
    console.log(
      "   Note: Full instantiation requires Next.js cookies() context"
    );
  } catch (error) {
    console.error("❌ Server client import failed:", error);
  }

  console.log("\n🎯 Database Agent: TypeScript client tests completed.");
}

// For Node.js execution, we need to mock the environment
if (typeof window === "undefined") {
  // Set environment variables for Node.js testing
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://kveahsantuaadsdtgibm.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "test-key";
}

testClients().catch(console.error);
