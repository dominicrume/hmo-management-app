const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function del() {
  const tId = '2169597e-fe87-4f05-87d7-18050a9752ea'; // abdul
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_logs?tenant_id=eq.${tId}`, {
    method: 'DELETE',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log('audit_logs status:', res.status, await res.text());
  
  const delRes = await fetch(`${supabaseUrl}/rest/v1/tenants?id=eq.${tId}`, {
    method: 'DELETE',
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
  });
  console.log('tenants status:', delRes.status, await delRes.text());
}
del();
