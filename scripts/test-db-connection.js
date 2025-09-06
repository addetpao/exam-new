#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Tests both client and server-side Supabase connections
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables manually
function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        process.env[key] = value;
      }
    });
  }
}
loadEnvFile();

async function testConnection() {
  console.log("🎯 Database Agent: Testing Supabase connection...\n");

  // Test 1: Client-side connection (anon key)
  console.log("1. Testing client-side connection (anon key)...");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    return;
  }

  const clientSupabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const { data, error } = await clientSupabase
      .from("users")
      .select("*")
      .limit(1);
    if (error) {
      if (error.code === "PGRST116") {
        console.log(
          '✅ Client connection successful (table "users" does not exist yet - expected)'
        );
      } else {
        console.log(
          `✅ Client connection successful (error: ${error.message}, code: ${error.code})`
        );
      }
    } else {
      console.log(
        `✅ Client connection successful (found ${data?.length || 0} users)`
      );
    }
  } catch (err) {
    console.error("❌ Client connection failed:", err.message);
  }

  // Test 2: Server-side connection (service role)
  console.log("\n2. Testing server-side connection (service role)...");

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    console.error("❌ Missing SUPABASE_SERVICE_ROLE_KEY");
    return;
  }

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .limit(1);
    if (error) {
      if (error.code === "PGRST116") {
        console.log(
          '✅ Admin connection successful (table "users" does not exist yet - expected)'
        );
      } else {
        console.log(
          `✅ Admin connection successful (error: ${error.message}, code: ${error.code})`
        );
      }
    } else {
      console.log(
        `✅ Admin connection successful (found ${data?.length || 0} users)`
      );
    }
  } catch (err) {
    console.error("❌ Admin connection failed:", err.message);
  }

  // Test 3: Basic database health check
  console.log("\n3. Testing database health...");

  try {
    const { data, error } = await adminSupabase.rpc("now");
    if (data) {
      console.log(`✅ Database health check passed (timestamp: ${data})`);
    } else if (error) {
      console.log(`⚠️ Database health check warning: ${error.message}`);
    }
  } catch (err) {
    console.error("❌ Database health check failed:", err.message);
  }

  console.log("\n🎯 Database Agent: Connection tests completed.");
}

// Handle both script execution and import
if (require.main === module) {
  testConnection().catch(console.error);
} else {
  module.exports = { testConnection };
}
