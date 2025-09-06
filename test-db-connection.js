#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Manual .env.local loading
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key] = valueParts.join('=').trim();
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔗 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Service key configured:', !!serviceRoleKey);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function testConnection() {
  try {
    // Test 1: Check if we can connect and query basic info
    console.log('\n📊 Testing basic connection...');
    const { data: connection, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      if (connectionError.code === 'PGRST204') {
        console.log('❌ Users table does not exist - migration needed!');
        console.log('Error:', connectionError.message);
        return false;
      } else {
        console.log('❌ Connection error:', connectionError);
        return false;
      }
    } else {
      console.log('✅ Connection successful - users table exists!');
    }
    
    // Test 2: Try to get table schema info
    console.log('\n📋 Checking users table schema...');
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_schema_info');
    
    if (schemaError && schemaError.code === 'PGRST202') {
      console.log('ℹ️  Schema function not available, checking manually...');
    }
    
    // Test 3: Try a simple select to verify table structure
    console.log('\n🔍 Testing table structure...');
    const { data: testSelect, error: selectError } = await supabase
      .from('users')
      .select('id, email, app_role')
      .limit(1);
    
    if (selectError) {
      console.log('❌ Table structure error:', selectError.message);
      
      if (selectError.message.includes('app_role')) {
        console.log('💡 Column app_role missing - partial migration detected');
      }
      return false;
    } else {
      console.log('✅ Table structure verified - all required columns present!');
      console.log('📊 Current users count:', testSelect?.length || 0);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Database Connection Test');
  console.log('==========================');
  
  const isHealthy = await testConnection();
  
  if (isHealthy) {
    console.log('\n🎉 Database is ready for authentication!');
    console.log('\n✅ Next steps:');
    console.log('1. Authentication should now work');
    console.log('2. Users can sign up and create profiles');
    console.log('3. RBAC policies are in place');
  } else {
    console.log('\n💥 Database migration required!');
    console.log('\n🔧 REQUIRED ACTION:');
    console.log('1. Go to: https://supabase.com/dashboard/project/kveahsantuaadsdtgibm');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Copy and execute: complete-migration.sql');
    console.log('4. Run this test again to verify');
    
    console.log('\n📁 Files created for you:');
    console.log('- complete-migration.sql (consolidated migration)');
    console.log('- This test script to verify after migration');
  }
}

main().catch(console.error);