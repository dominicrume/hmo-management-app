const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function markInactive() {
  const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,full_name,status`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  
  const testNames = ['abdul', 'Uririe Orume Dominic', 'shawrna', 'adrian', 'shofiqul haque', 'mattew', 'John Doe'];
  const toDelete = data.filter(t => testNames.includes(t.full_name) || t.full_name.toLowerCase().includes('test'));
  
  for (const t of toDelete) {
    if (t.full_name.startsWith('[DELETED]')) continue;
    
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/tenants?id=eq.${t.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: 'inactive',
        full_name: '[DELETED] ' + t.full_name
      })
    });
    
    if (patchRes.ok) {
      console.log('Marked inactive:', t.full_name);
    } else {
      console.error('Failed to mark inactive', t.full_name, await patchRes.text());
    }
  }
}
markInactive();
