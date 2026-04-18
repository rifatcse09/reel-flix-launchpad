import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================
const SUPABASE_URL = 'https://dnogpmarnkvdifenuupa.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY'; // Supabase project Settings → API

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
// Create Auth Users from Profiles
// ============================================
async function createAuthUsersFromProfiles() {
  console.log('🔐 Creating auth users from profiles...\n');
  
  // Fetch all profiles
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name');
  
  if (profileError) {
    console.error('❌ Failed to fetch profiles:', profileError);
    return;
  }
  
  if (!profiles || profiles.length === 0) {
    console.log('⊘ No profiles found');
    return;
  }
  
  console.log(`Found ${profiles.length} profiles\n`);
  
  let created = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const profile of profiles) {
    try {
      if (!profile.email) {
        console.log(`⚠️  Skipping profile ${profile.id} - no email`);
        skipped++;
        continue;
      }
      
      console.log(`Processing: ${profile.email} (ID: ${profile.id})`);
      
      // Check if auth user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserById(profile.id);
      
      if (existingUser?.user) {
        console.log(`  ✓ Auth user already exists\n`);
        skipped++;
        continue;
      }
      
      // Create auth user with same ID as profile
      const { data, error } = await supabase.auth.admin.createUser({
        id: profile.id, // Use same ID as profile!
        email: profile.email,
        password: Math.random().toString(36).slice(-12) + 'Aa1!',
        email_confirm: true,
        user_metadata: {
          full_name: profile.full_name
        }
      });
      
      if (error) {
        console.error(`  ❌ Failed:`, error.message);
        failed++;
      } else {
        console.log(`  ✓ Created auth user\n`);
        created++;
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`✓ Created: ${created}`);
  console.log(`⊘ Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n⚠️  All users will need to reset their passwords');
}

// Run the script
createAuthUsersFromProfiles();
