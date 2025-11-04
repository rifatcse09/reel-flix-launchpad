# Migration Guide: Lovable Cloud to Your Own Supabase

This guide will help you migrate your database and data from Lovable Cloud to your own Supabase project.

## Prerequisites

- A new Supabase project (create one at [supabase.com](https://supabase.com))
- Admin access to your Lovable Cloud project
- Supabase CLI installed (optional but recommended)

## Step 1: Export Your Data

1. **Login as admin** in your Lovable Cloud project
2. **Run the export function**:
   - Open your browser's developer console (F12)
   - Run this code:

```javascript
const { data, error } = await window.supabase.functions.invoke('export-database');
if (error) {
  console.error('Export failed:', error);
} else {
  // Download the data
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'database-export.json';
  a.click();
  console.log('Export successful! Check your downloads.');
}
```

3. **Save the exported JSON file** - this contains all your data

## Step 2: Set Up Your New Supabase Project

### 2.1 Create a New Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your:
   - Project URL
   - Project anon/public key
   - Service role key

### 2.2 Apply Schema Migrations

**Option A: Using Supabase Dashboard**
1. Go to your project's SQL Editor in Supabase Dashboard
2. Copy and paste each migration file from `supabase/migrations/` in chronological order
3. Execute them one by one

**Option B: Using Supabase CLI** (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your new project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrations
supabase db push
```

## Step 3: Import Your Data

**IMPORTANT**: This import requires your `service_role` key to create auth users.

Create a file `import-data.mjs`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SUPABASE_URL = 'YOUR_NEW_PROJECT_URL';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // Required for auth import
const EXPORT_FILE_PATH = './database-export.json'; // Path to your export file

// ============================================
// Initialize Supabase Admin Client
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================
// Read Export File
// ============================================
let exportData;
try {
  const fileContent = readFileSync(EXPORT_FILE_PATH, 'utf-8');
  exportData = JSON.parse(fileContent);
  console.log('📦 Loaded export file successfully');
} catch (error) {
  console.error('❌ Failed to read export file:', error.message);
  process.exit(1);
}

// ============================================
// STEP 1: Import Auth Users & Build ID Mapping
// ============================================
const userIdMapping = new Map(); // Maps old UUID -> new UUID

async function importAuthUsers() {
  console.log('\n🔐 Importing Auth Users...');
  
  if (!exportData.auth_users || exportData.auth_users.length === 0) {
    console.log('⊘ No auth users to import');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const user of exportData.auth_users) {
    try {
      console.log(`Creating user: ${user.email} (old ID: ${user.id})...`);
      
      // Create user with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: Math.random().toString(36).slice(-12) + 'Aa1!', // Temporary password
        email_confirm: true,
        user_metadata: user.user_metadata || {},
        app_metadata: user.app_metadata || {}
      });

      if (error) {
        console.error(`  ❌ Auth creation failed:`, error);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No user data returned from createUser');
      }
      
      // Map old user ID to new user ID
      userIdMapping.set(user.id, data.user.id);
      
      successCount++;
      console.log(`  ✓ Created auth user: ${user.email}`);
      console.log(`    Old ID: ${user.id}`);
      console.log(`    New ID: ${data.user.id}`);
    } catch (error) {
      errorCount++;
      console.error(`  ❌ Failed to create user ${user.email}:`, error.message);
    }
  }

  console.log(`\n📊 Auth Import Summary: ${successCount} created, ${errorCount} failed`);
  
  if (successCount === 0) {
    throw new Error('CRITICAL: No auth users were created! Cannot proceed with data import.');
  }
  
  console.log(`\n✓ User ID mapping created with ${userIdMapping.size} entries`);
  console.log('⚠️  All users will need to reset their passwords\n');
}

// ============================================
// Update User IDs in Export Data
// ============================================
function updateUserIds() {
  console.log('🔄 Updating user IDs in export data...\n');
  
  for (const tableName in exportData.tables) {
    const rows = exportData.tables[tableName];
    if (!rows) continue;
    
    for (const row of rows) {
      // Update user_id fields
      if (row.user_id && userIdMapping.has(row.user_id)) {
        row.user_id = userIdMapping.get(row.user_id);
      }
      
      // Update id field for profiles table
      if (tableName === 'profiles' && row.id && userIdMapping.has(row.id)) {
        row.id = userIdMapping.get(row.id);
      }
      
      // Update referrer_id fields
      if (row.referrer_id && userIdMapping.has(row.referrer_id)) {
        row.referrer_id = userIdMapping.get(row.referrer_id);
      }
      
      // Update created_by fields
      if (row.created_by && userIdMapping.has(row.created_by)) {
        row.created_by = userIdMapping.get(row.created_by);
      }
      
      // Update updated_by fields
      if (row.updated_by && userIdMapping.has(row.updated_by)) {
        row.updated_by = userIdMapping.get(row.updated_by);
      }
      
      // Update processed_by fields
      if (row.processed_by && userIdMapping.has(row.processed_by)) {
        row.processed_by = userIdMapping.get(row.processed_by);
      }
      
      // Update visitor_id fields
      if (row.visitor_id && userIdMapping.has(row.visitor_id)) {
        row.visitor_id = userIdMapping.get(row.visitor_id);
      }
    }
  }
}

// ============================================
// STEP 2: Delete Default Plans
// ============================================
async function deleteDefaultPlans() {
  console.log('🗑️  Deleting default plans from migrations...');
  
  try {
    const { error } = await supabase
      .from('plans')
      .delete()
      .in('id', [1, 2, 3]);

    if (error) throw error;
    console.log('✓ Deleted default plans (IDs: 1, 2, 3)\n');
  } catch (error) {
    console.error('❌ Failed to delete default plans:', error.message);
  }
}

// ============================================
// STEP 3: Import Table Data
// ============================================
async function importTableData() {
  console.log('📊 Importing table data...\n');

  // Import order matters due to foreign keys
  const tableOrder = [
    'plans',           // No dependencies - import your old plans first
    'profiles',        // References auth.users (already created)
    'user_roles',      // References profiles
    'referral_codes',  // References profiles
    'subscriptions',   // References profiles, plans, referral_codes
    'referral_clicks', // References referral_codes
    'referral_uses',   // References referral_codes
    'referrer_commissions', // References profiles
    'payout_logs',     // References profiles
    'user_sessions',   // References profiles
    'notification_templates', // References profiles
    'notifications',   // References profiles, templates
    'notification_reads', // References notifications, profiles
    'notification_clicks', // References notifications, profiles
    'notification_preferences', // References profiles
    'app_settings',    // References profiles
    'trial_ip_usage',  // References profiles
    'referral_alert_thresholds' // References referral_codes
  ];

  const results = {};

  for (const tableName of tableOrder) {
    const tableData = exportData.tables?.[tableName];
    
    if (!tableData || tableData.length === 0) {
      console.log(`⊘ Skipping ${tableName} (no data)`);
      results[tableName] = { success: 0, errors: 0 };
      continue;
    }

    console.log(`\nImporting ${tableData.length} rows into ${tableName}...`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const row of tableData) {
      try {
        // Log first row of critical tables for debugging
        if ((tableName === 'profiles' || tableName === 'user_roles') && successCount === 0 && errorCount === 0) {
          console.log(`  Sample row:`, JSON.stringify(row, null, 2));
        }
        
        const { error } = await supabase
          .from(tableName)
          .upsert(row, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (error) throw error;
        successCount++;
        
        // Log successful critical imports
        if (tableName === 'profiles' || tableName === 'user_roles') {
          console.log(`  ✓ Imported row with ID: ${row.id}`);
        }
      } catch (error) {
        errorCount++;
        if (errorCount <= 3) {
          console.error(`  ❌ Row failed:`, error.message);
          console.error(`     Data:`, JSON.stringify(row, null, 2));
        } else if (errorCount === 4) {
          console.error(`  ... suppressing further errors for ${tableName}`);
        }
      }
    }

    results[tableName] = { success: successCount, errors: errorCount };
    
    if (successCount > 0) {
      console.log(`✓ ${tableName}: ${successCount} rows imported`);
    }
    if (errorCount > 0) {
      console.log(`⚠️  ${tableName}: ${errorCount} rows failed`);
    }
  }

  return results;
}

// ============================================
// Main Import Process
// ============================================
async function runImport() {
  console.log('=== Starting Database Import ===\n');
  console.log('Target:', SUPABASE_URL);
  console.log('Export file:', EXPORT_FILE_PATH);
  
  try {
    // Step 1: Import auth users first (required for foreign keys)
    await importAuthUsers();
    
    // Step 2: Update all user IDs in exported data to match new auth user IDs
    updateUserIds();
    
    // Step 3: Delete default plans (so your old plans can be imported)
    await deleteDefaultPlans();
    
    // Step 4: Import all table data including your old plans
    const results = await importTableData();
    
    // Summary
    console.log('\n=== Import Complete ===');
    console.log('\n📊 Summary by Table:');
    Object.entries(results).forEach(([table, stats]) => {
      if (stats.success > 0 || stats.errors > 0) {
        console.log(`  ${table}: ${stats.success} succeeded, ${stats.errors} failed`);
      }
    });
    
    console.log('\n✓ Your old plans have been imported (replacing default plans)');
    console.log('⚠️  IMPORTANT: All users must reset their passwords before logging in');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
runImport();
```

Install dependencies and run:
```bash
npm install @supabase/supabase-js
node import-data.mjs
```

## Step 4: Configure Secrets

Add your secrets in the new Supabase project:

1. Go to Project Settings > Edge Functions
2. Add these secrets (use values from your Lovable Cloud project):
   - WHMCS_URL
   - WHMCS_API_IDENTIFIER
   - WHMCS_API_SECRET
   - WHMCS_API_ACCESS_KEY
   - WHMCS_WEBHOOK_SECRET
   - WHMCS_PAYMENT_SECRET
   - WHMCS_PAYMENT_METHOD
   - WHMCS_TRIAL_PRODUCT_ID
   - STRIPE_SECRET_KEY
   - RESEND_API_KEY

## Step 5: Update Your Application

Update your app's environment variables:

```env
VITE_SUPABASE_URL=https://YOUR_NEW_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_NEW_ANON_KEY
```

## Step 6: Deploy Edge Functions

Deploy your edge functions to the new project:

```bash
# Login and link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy stripe-webhook
supabase functions deploy whmcs-webhook
supabase functions deploy track-referral-click
supabase functions deploy trial-create
supabase functions deploy validate-trial-signup
supabase functions deploy record-trial-usage
supabase functions deploy delete-user
supabase functions deploy purchase-subscriptions
supabase functions deploy payment-page
```

## Step 7: Verify Migration

1. **Check Row Counts**: Compare record counts in both databases
2. **Test Authentication**: Try logging in
3. **Test Functions**: Verify edge functions work
4. **Check Storage**: If you use storage, migrate files separately

## Troubleshooting

### Foreign Key Errors
If you get foreign key errors during import:
- Import tables in the correct order (as shown in the script)
- Temporarily disable foreign key checks

### Duplicate Key Errors
- Make sure you're importing into an empty database
- Or use `ON CONFLICT` clauses in your INSERT statements

### Permission Errors
- Make sure you're using the service role key for imports
- Check RLS policies are properly set up

## Post-Migration Checklist

- [ ] All data imported successfully
- [ ] User authentication works
- [ ] Edge functions deployed and working
- [ ] Secrets configured
- [ ] Storage migrated (if applicable)
- [ ] Webhooks updated to point to new endpoints
- [ ] Application updated with new credentials
- [ ] Test all critical functionality

## Need Help?

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify RLS policies are correctly set up
3. Ensure all migrations ran successfully
4. Check edge function logs for errors

---

**Note**: Keep your Lovable Cloud project running until you've fully verified the migration is successful.
