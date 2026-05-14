const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function list() {
  const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,full_name,status`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log(`Total tenants: ${data.length}`);
  data.forEach(t => console.log(`- ${t.full_name} (${t.status})`));
}
list();
