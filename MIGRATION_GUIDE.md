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

1. **Open your new Supabase project's SQL Editor**

2. **Run this import script** (replace the data with your exported data):

```sql
-- Disable triggers temporarily to avoid issues
SET session_replication_role = replica;

-- Import profiles
INSERT INTO profiles (id, created_at, updated_at, full_name, email, referral_code, address, avatar_url, player_link, m3u_link, birthday, trial_used, trial_started_at, trial_ends_at, phone, country, state, username, whmcs_client_id)
SELECT * FROM json_populate_recordset(NULL::profiles, 
  '[PASTE YOUR PROFILES DATA HERE]'
);

-- Import user_roles
INSERT INTO user_roles (id, user_id, role, created_at)
SELECT * FROM json_populate_recordset(NULL::user_roles,
  '[PASTE YOUR USER_ROLES DATA HERE]'
);

-- Repeat for each table...
-- (See the exported JSON for the exact data)

-- Re-enable triggers
SET session_replication_role = DEFAULT;
```

3. **Alternative: Use a script** to automate the import:

Create a file `import-data.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'YOUR_NEW_PROJECT_URL';
const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function importData() {
  const exportData = JSON.parse(fs.readFileSync('database-export.json', 'utf8'));
  
  for (const [tableName, records] of Object.entries(exportData.tables)) {
    if (records.length === 0) continue;
    
    console.log(`Importing ${tableName}: ${records.length} records...`);
    
    // Import in batches of 100
    for (let i = 0; i < records.length; i += 100) {
      const batch = records.slice(i, i + 100);
      const { error } = await supabase.from(tableName).insert(batch);
      
      if (error) {
        console.error(`Error importing ${tableName}:`, error);
      } else {
        console.log(`Imported batch ${i / 100 + 1} for ${tableName}`);
      }
    }
  }
  
  console.log('Import complete!');
}

importData();
```

Run it:
```bash
node import-data.js
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
