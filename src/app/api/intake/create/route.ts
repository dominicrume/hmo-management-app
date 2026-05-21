import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// POST /api/intake/create
// Creates a new tenant record server-side using the service-role client.
// This bypasses RLS correctly — the acting user's auth is still verified,
// but the DB write uses the service role so it isn't blocked by RLS policies.
//
// Body: the full tenant payload from staff-review (same shape as before)

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const svc      = createServiceClient();

    // 1. Verify the acting user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised — please log in.' }, { status: 401 });
    }

    // 2. Verify they have a staff profile (Manager or SupportWorker)
    const { data: dbUser, error: userErr } = await svc
      .from('users')
      .select('id, full_name, role, is_active')
      .eq('auth_id', user.id)
      .single();

    if (userErr || !dbUser) {
      return NextResponse.json({ error: 'Staff profile not found. Contact your administrator.' }, { status: 403 });
    }

    if (!dbUser.is_active) {
      return NextResponse.json({ error: 'Account deactivated. Contact your administrator.' }, { status: 403 });
    }

    if (!['Manager', 'SupportWorker'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Forbidden — only staff can create tenant records.' }, { status: 403 });
    }

    const payload = await req.json();

    // 3. Validate required fields
    const required = ['full_name', 'dob', 'nino', 'room_number', 'mobile', 'moved_in', 'nok_name', 'nok_phone'];
    for (const field of required) {
      if (!payload[field]?.toString().trim()) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // 4. Normalise enums
    const mapBenefitType = (bt: string): string => {
      if (!bt) return 'None';
      const l = bt.toLowerCase();
      if (l.includes('universal') || l === 'uc') return 'UC';
      if (l.includes('housing')   || l === 'hb') return 'HB';
      if (l.includes('pip'))                       return 'PIP';
      if (l.includes('esa'))                       return 'ESA';
      if (l.includes('jsa'))                       return 'JSA';
      if (l.includes('none') || !bt.trim())       return 'None';
      return 'Other';
    };

    const mapBenefitFreq = (bf: string): string => {
      if (!bf) return 'Weekly';
      const l = bf.toLowerCase();
      if (l.includes('month'))                            return 'Monthly';
      if (l.includes('fort') || l.includes('2wk'))       return '2wk';
      return 'Weekly';
    };

    const tenantPayload = {
      title:                payload.title                || 'Mr',
      full_name:            payload.full_name.trim(),
      dob:                  payload.dob,
      nino:                 payload.nino.trim().toUpperCase(),
      nationality:          payload.nationality           || '',
      date_entry_uk:        payload.date_entry_uk         || null,
      address:              payload.address               || '',
      room_number:          payload.room_number.trim(),
      email:                payload.email                 || null,
      mobile:               payload.mobile.trim(),
      languages:            payload.languages             || null,
      benefit_type:         mapBenefitType(payload.benefit_type),
      benefit_freq:         mapBenefitFreq(payload.benefit_freq),
      benefit_amount:       parseFloat(payload.benefit_amount) || 0,
      nok_name:             payload.nok_name.trim(),
      nok_relation:         payload.nok_relation           || '',
      nok_phone:            payload.nok_phone.trim(),
      // nok_address:          payload.nok_address            || null,
      doctor:               payload.doctor                 || null,
      place_of_birth:       payload.place_of_birth         || null,
      marital_status:       payload.marital_status         || null,
      employer_or_college:  payload.employer_or_college    || null,
      vehicle_registration: payload.vehicle_registration   || null,
      moved_in:             payload.moved_in,
      brand:                payload.brand                  || 'mattys_place',
      status:               'active' as const,
      on_probation:         payload.on_probation           ?? false,
      probation_officer:    payload.probation_officer      || null,
      confidentiality_signed: false,
      assigned_worker_id:   dbUser.role === 'SupportWorker' ? dbUser.id : null,
      created_by:           dbUser.id,
    };

    // 5. Insert using service client (bypasses RLS, always succeeds for valid staff)
    const { data: tenant, error: insertErr } = await svc
      .from('tenants')
      .insert(tenantPayload)
      .select('id, full_name')
      .single();

    if (insertErr) {
      console.error('[intake/create] Insert error:', insertErr);
      return NextResponse.json({ error: `Database error: ${insertErr.message}` }, { status: 500 });
    }

    // 6. Write audit log for the CREATE event (service client)
    const auditPayload = {
      actor_id:     dbUser.id,
      actor_name:   dbUser.full_name,
      actor_role:   dbUser.role,
      tenant_id:    tenant.id,
      table_name:   'tenants',
      record_id:    tenant.id,
      action:       'CREATE' as const,
      entry_method: (payload._entry_method ?? 'manual') as 'manual' | 'ocr' | 'voice',
      new_data:     tenantPayload,
      diff_fields:  Object.keys(tenantPayload),
    };

    const { data: auditRecord, error: auditErr } = await svc
      .from('audit_logs')
      .insert(auditPayload)
      .select('id, payload_hash')
      .single();

    if (auditErr) {
      console.warn('[intake/create] Audit log error (non-fatal):', auditErr.message);
    }

    // 7. Blockchain stamp (non-blocking)
    if (auditRecord?.payload_hash) {
      try {
        const { stampRecordOnChain } = await import('@/lib/blockchain/stamp');
        const result = await stampRecordOnChain(auditRecord.payload_hash, `audit:${auditRecord.id}`);
        if (result.success && result.transactionHash) {
          await svc.from('audit_logs').update({ blockchain_tx_id: result.transactionHash }).eq('id', auditRecord.id);
          await svc.from('blockchain_stamps').insert({
            payload_hash: auditRecord.payload_hash,
            audit_log_id: auditRecord.id,
            tx_hash:      result.transactionHash,
            block_number: result.blockNumber ?? null,
            stamp_type:   'individual',
            metadata:     `intake:${tenant.id}`,
          });
        }
      } catch (chainErr) {
        console.warn('[intake/create] Blockchain stamp skipped (non-fatal):', chainErr);
      }
    }

    // 8. If SupportWorker, auto-assign them to this tenant in worker_tenant_assignments
    if (dbUser.role === 'SupportWorker') {
      const { error: assignErr } = await svc
        .from('worker_tenant_assignments')
        .insert({ worker_id: dbUser.id, tenant_id: tenant.id });
      if (assignErr) console.warn('[intake/create] Assignment error (non-fatal):', assignErr.message);
    }

    return NextResponse.json({
      ok:        true,
      tenant_id: tenant.id,
      full_name: tenant.full_name,
      audit_log: auditRecord?.id ?? null,
      hash:      auditRecord?.payload_hash ?? null,
    });

  } catch (e: unknown) {
    console.error('[intake/create]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create tenant.' },
      { status: 500 }
    );
  }
}
