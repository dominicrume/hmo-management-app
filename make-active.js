const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function makeActive() {
  const res = await fetch(`${supabaseUrl}/rest/v1/tenants?select=id,full_name,status`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  
  const toRestore = data.filter(t => t.full_name.startsWith('[DELETED] '));
  
  for (const t of toRestore) {
    const originalName = t.full_name.replace('[DELETED] ', '');
    const patchRes = await fetch(`${supabaseUrl}/rest/v1/tenants?id=eq.${t.id}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        status: 'active',
        full_name: originalName
      })
    });
    
    if (patchRes.ok) {
      console.log('Restored:', originalName);
    } else {
      console.error('Failed to restore', originalName, await patchRes.text());
    }
  }
}
makeActive();
