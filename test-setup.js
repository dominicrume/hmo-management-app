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
  const refresh = auth.refresh_token;
  if (!token) { console.error('Auth failed', auth); return; }

  // Next.js uses the sb-[ref]-auth-token cookie format
  // Actually, @supabase/ssr uses specific chunked cookies.
  // It's easier to just call the Supabase API directly in this script to see what's failing in the `users` table.

  // Wait, the setup API does:
  // 1. check existing user in `users` using svc client
  // 2. insert user in `users` using svc client
  
  const checkRes = await fetch('https://gjfbjyrhkblqdcsmmckb.supabase.co/rest/v1/users?select=id,role&auth_id=eq.' + auth.user.id, {
    method: 'GET',
    headers: { 
      'apikey': apiKey, // Using anon key
      'Authorization': 'Bearer ' + token 
    }
  });
  console.log('Check users GET:', await checkRes.text());

  // If we try to insert using service role, what happens?
  const svcKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmJqeXJoa2JscWRjc21tY2tiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2MzQ2MiwiZXhwIjoyMDkyMzM5NDYyfQ.FlZRvBneB_1ih9XwLMoR1GeDWhChL-RUsg74J-NgFZ4';
  const insertRes = await fetch('https://gjfbjyrhkblqdcsmmckb.supabase.co/rest/v1/users', {
    method: 'POST',
    headers: {
      'apikey': svcKey,
      'Authorization': 'Bearer ' + svcKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      auth_id: auth.user.id,
      full_name: 'Manager',
      email: 'dominicrume@gmail.com',
      role: 'Manager',
      brand: 'mattys_place',
    })
  });
  console.log('SVC Insert POST status:', insertRes.status);
  console.log('SVC Insert POST response:', await insertRes.text());
}
main();
