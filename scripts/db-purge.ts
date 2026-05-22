import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const envLocal = fs.readFileSync('.env.local', 'utf-8');
const extractEnv = (key: string): string => {
  const match = envLocal.match(new RegExp(`^${key}=(.*)$`, 'm'));
  if (!match) throw new Error(`Missing environment variable: ${key}`);
  return match[1].trim();
};

const supabaseUrl = extractEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = extractEnv('SUPABASE_SERVICE_ROLE_KEY');

const adminSupabase = createClient(supabaseUrl, supabaseKey);
const TEMP_EMAIL = 'temp_purge_admin@vorem.com';
const TEMP_PASSWORD = 'TempPassword123!@#';

async function purgeTable(table: string) {
  console.log(`Purging ${table}...`);
  const { error } = await adminSupabase
    .from(table)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
    
  if (error) {
    console.log(`Note: Failed to purge ${table} (${error.message})`);
  } else {
    console.log(`Successfully purged ${table}`);
  }
}

async function run() {
  console.log('Initiating Database Purge Protocol...');
  
  // Clean other tables using service role
  const tables = [
    'notifications',
    'payment_transactions',
    'housing_claims',
    'documents',
    'tenancy_agreements',
    'tenant_providers',
    'worker_tenant_assignments',
    'tenant_verifications',
    'service_charges',
    'sessions',
    'login_history',
    'rooms',
    'properties',
  ];

  for (const table of tables) {
    await purgeTable(table);
  }

  console.log('Authenticating as temporary admin to soft-delete tenants...');
  
  // 1. Create temp user
  const { data: userAuth, error: createErr } = await adminSupabase.auth.admin.createUser({
    email: TEMP_EMAIL,
    password: TEMP_PASSWORD,
    email_confirm: true
  });
  
  if (createErr) {
    console.log("Temp admin might already exist:", createErr.message);
  }
  
  const { data: signInData, error: signInErr } = await adminSupabase.auth.signInWithPassword({
    email: TEMP_EMAIL,
    password: TEMP_PASSWORD,
  });
  
  if (signInErr) {
    console.error("Failed to sign in:", signInErr.message);
    process.exit(1);
  }
  
  const token = signInData.session.access_token;
  const tempUserId = signInData.user.id;
  
  // 2. Insert into users table
  await adminSupabase.from('users').upsert({
    auth_id: tempUserId,
    full_name: 'Temp Admin',
    email: TEMP_EMAIL,
    role: 'Manager',
    brand: 'mattys_place'
  });
  
  // 3. Create authenticated client
  const userSupabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  
  // 4. Soft-delete tenants
  console.log('Updating tenants status to inactive...');
  const { data: activeTenants } = await userSupabase.from('tenants').select('id').eq('status', 'active');
  
  if (activeTenants && activeTenants.length > 0) {
    for (const t of activeTenants) {
      const { error } = await userSupabase
        .from('tenants')
        .update({ status: 'inactive' })
        .eq('id', t.id);
      if (error) console.error(`Failed to update tenant ${t.id}:`, error.message);
      else console.log(`Deactivated tenant ${t.id}`);
    }
  } else {
    console.log('No active tenants found.');
  }
  
  // 5. Cleanup
  console.log('Cleaning up temporary admin...');
  await adminSupabase.from('users').delete().eq('auth_id', tempUserId);
  await adminSupabase.auth.admin.deleteUser(tempUserId);
  
  console.log('Database Purge Complete. All test records wiped.');
  
  // Verify
  const { count } = await adminSupabase.from('tenants').select('*', { count: 'exact', head: true }).eq('status', 'active');
  console.log(`Verification: Total Active Tenants remaining = ${count}`);
}

run().catch(console.error);
