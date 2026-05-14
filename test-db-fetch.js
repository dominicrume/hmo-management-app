const url = 'https://gjfbjyrhkblqdcsmmckb.supabase.co/auth/v1/token?grant_type=password';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmJqeXJoa2JscWRjc21tY2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM0NjIsImV4cCI6MjA5MjMzOTQ2Mn0.3LbGRsQlzv8Pz05XoBImsuN3aXhHFQpo-0Eq84Hi40k';

async function main() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'apikey': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dominicrume@gmail.com', password: 'password123' })
  });
  const auth = await res.json();
  const token = auth.access_token;
  if (!token) { console.error('Auth failed', auth); return; }

  // Insert test
  const insertRes = await fetch('https://gjfbjyrhkblqdcsmmckb.supabase.co/rest/v1/tenants', {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      full_name: 'Test Tenant',
      nino: 'AB123456C',
      room_number: '1A',
      mobile: '07700900000',
      moved_in: '2023-01-01',
      nok_name: 'Next of Kin',
      nok_phone: '07700900001',

      status: 'active',
      created_by: auth.user.id,
    })
  });
  console.log('Insert status:', insertRes.status);
  console.log('Insert body:', await insertRes.text());
}
main();
