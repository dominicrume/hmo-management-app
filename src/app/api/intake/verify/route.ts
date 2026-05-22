import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const svc = createServiceClient();

    // Verify auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const payload = await req.json();
    const { tenant_id, signature_data, document_hash, signed_at } = payload;

    if (!tenant_id || !signature_data || !document_hash || !signed_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save verification record
    const { error: verifyErr } = await svc.from('tenant_verifications').insert({
      tenant_id,
      verified_by_tenant: true,
      verification_type: 'digital_signature',
      signature_data,
      signed_at,
    });

    if (verifyErr) {
      console.error('[intake/verify] Verify insert error:', verifyErr);
      return NextResponse.json({ error: verifyErr.message }, { status: 500 });
    }

    // Update tenant confidentiality_signed
    const { error: updateErr } = await svc
      .from('tenants')
      .update({ confidentiality_signed: true, confidentiality_signed_at: signed_at })
      .eq('id', tenant_id);

    if (updateErr) {
      console.error('[intake/verify] Tenant update error:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('[intake/verify] Error:', e);
    return NextResponse.json({ error: e.message || 'Verification failed' }, { status: 500 });
  }
}
