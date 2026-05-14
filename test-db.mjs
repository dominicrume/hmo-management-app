import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gjfbjyrhkblqdcsmmckb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmJqeXJoa2JscWRjc21tY2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM0NjIsImV4cCI6MjA5MjMzOTQ2Mn0.3LbGRsQlzv8Pz05XoBImsuN3aXhHFQpo-0Eq84Hi40k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // login
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'dominicrume@gmail.com',
    password: 'password123',
  });
  if (authErr) { console.error('Auth Error:', authErr); return; }
  console.log('Logged in!');

  // try to fetch a tenant to see columns
  const { data: tenants, error } = await supabase.from('tenants').select('*').limit(1);
  if (error) { console.error('Fetch Error:', error); return; }
  console.log('Tenant keys:', Object.keys(tenants[0] || {}));

  // Try to insert a dummy row to test `nok_address` error
  const { error: insertErr } = await supabase.from('tenants').insert({
    full_name: 'Test Tenant',
    nino: 'AB123456C',
    room_number: '1A',
    mobile: '07700900000',
    moved_in: '2023-01-01',
    nok_name: 'Next of Kin',
    nok_phone: '07700900001',
    nok_address: '123 Fake Street',
    status: 'active',
    created_by: auth.user.id,
  });
  console.log('Insert Error:', insertErr);
}
main();
