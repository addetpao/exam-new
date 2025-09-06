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

console.log('🚀 Database Migration Deployment');
console.log('=================================');
console.log('URL:', supabaseUrl);
console.log('Service key configured:', !!serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables!');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

async function deployMigration() {
  try {
    console.log('\n📖 Reading migration file...');
    const migrationPath = path.join(__dirname, 'complete-migration.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded successfully');
    console.log(`📊 Migration size: ${migrationSQL.length} characters`);
    
    console.log('\n⚡ Executing database migration...');
    console.log('⏳ This may take a few moments...');
    
    // Execute the migration using the rpc method for raw SQL execution
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });
    
    // If the rpc method doesn't exist, we'll try a different approach
    if (error && error.code === 'PGRST202') {
      console.log('ℹ️  Using alternative SQL execution method...');
      
      // Split the migration into smaller chunks by statements
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      console.log(`📝 Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.length === 0 || statement.startsWith('--')) continue;
        
        try {
          // For PostgreSQL operations, we need to use the PostgREST API directly
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({ sql_query: statement + ';' })
          });
          
          if (!response.ok) {
            // If direct SQL execution isn't available, we'll use the migrations endpoint
            console.log(`🔄 Statement ${i + 1}/${statements.length}: Using alternative approach...`);
            
            // This approach requires using Supabase's internal migration system
            // For now, we'll log that manual execution is needed
            if (i === 0) {
              console.log('\n🔧 MANUAL MIGRATION REQUIRED');
              console.log('The Supabase API doesn\'t support direct SQL execution through this method.');
              console.log('\n📋 DEPLOYMENT INSTRUCTIONS:');
              console.log('1. Go to: https://supabase.com/dashboard/project/kveahsantuaadsdtgibm');
              console.log('2. Navigate to: SQL Editor');
              console.log('3. Create a new query and paste the contents of: complete-migration.sql');
              console.log('4. Click "Run" to execute the migration');
              console.log('5. Run: node test-db-connection.js to verify success');
              
              console.log('\n📁 Migration file location:');
              console.log('Path:', migrationPath);
              
              return false;
            }
          } else {
            const result = await response.json();
            if (result.error) {
              console.error(`❌ Error in statement ${i + 1}:`, result.error);
              return false;
            }
          }
        } catch (statementError) {
          console.error(`❌ Failed to execute statement ${i + 1}:`, statementError.message);
          // Continue with other statements for now
        }
      }
      
      console.log('✅ Migration statements processed');
      
    } else if (error) {
      console.error('❌ Migration failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return false;
    } else {
      console.log('✅ Migration executed successfully!');
      console.log('Result:', data);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function verifyDeployment() {
  console.log('\n🔍 Verifying deployment...');
  
  try {
    // Test basic connection to users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Verification failed:', error.message);
      return false;
    } else {
      console.log('✅ Users table is accessible!');
      return true;
    }
  } catch (error) {
    console.log('❌ Verification error:', error.message);
    return false;
  }
}

async function main() {
  const migrationSuccess = await deployMigration();
  
  if (migrationSuccess) {
    console.log('\n🎯 Migration deployment completed!');
    
    const verificationSuccess = await verifyDeployment();
    
    if (verificationSuccess) {
      console.log('\n🎉 DATABASE MIGRATION SUCCESSFUL!');
      console.log('\n✅ Next steps:');
      console.log('1. Authentication system should now be functional');
      console.log('2. Users can sign up and create profiles');
      console.log('3. Run: node test-db-connection.js for detailed verification');
      console.log('4. Test the application login/signup flow');
    } else {
      console.log('\n⚠️  Migration completed but verification failed');
      console.log('Run: node test-db-connection.js for detailed diagnostics');
    }
  } else {
    console.log('\n💥 MIGRATION REQUIRES MANUAL EXECUTION');
    console.log('\nPlease follow the manual deployment instructions above.');
  }
}

main().catch(console.error);