const url = 'https://gjfbjyrhkblqdcsmmckb.supabase.co/auth/v1/token?grant_type=password';
const apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqZmJqeXJoa2JscWRjc21tY2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjM0NjIsImV4cCI6MjA5MjMzOTQ2Mn0.3LbGRsQlzv8Pz05XoBImsuN3aXhHFQpo-0Eq84Hi40k';
const svcKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2MzQ2MiwiZXhwIjoyMDkyMzM5NDYyfQ.FlZRvBneB_1ih9XwLMoR1GeDWhChL-RUsg74J-NgFZ4';

async function main() {
  const res = await fetch('https://gjfbjyrhkblqdcsmmckb.supabase.co/rest/v1/sessions', {
    method: 'POST',
    headers: {
      'apikey': svcKey,
      'Authorization': 'Bearer ' + svcKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      tenant_id: 'd9e5f5f4-3079-4d9d-bc32-84de0f592231', // Any random UUID
      worker_id: 'b39c9162-8e12-42db-980b-226e6deab661', // Random UUID
      session_type: 'daily',
      session_date: '2026-05-13'
    })
  });
  console.log('Insert Session Status:', res.status);
  console.log('Response:', await res.text());
}
main();
