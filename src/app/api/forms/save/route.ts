import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { AuditAction, EntryMethod } from '@/types/database';

// POST /api/forms/save
// Body: { form_id, tenant_id, data, stamp }
// stamp=true  → write to DB + audit log (blockchain stamp)
// stamp=false → write to DB only (draft)

export async function POST(req: NextRequest) {
  try {
    const { form_id, tenant_id, data, stamp = false } = await req.json();

    if (!form_id)   return NextResponse.json({ error: 'form_id required' }, { status: 400 });
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    if (!data)      return NextResponse.json({ error: 'data required' }, { status: 400 });

    const supabase = createClient();
    const svc      = createServiceClient();

    // Resolve the acting user for audit trail
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Staff profile not found' }, { status: 403 });

    let savedRecord: Record<string, unknown> = {};
    let tableName: string;
    let recordId: string = tenant_id;
    let action: AuditAction = stamp ? 'EDIT' : 'EDIT';
    const entryMethod: EntryMethod = 'manual';

    // ── Route by form type ────────────────────────────────────────────────────

    if (form_id === 'personal' || form_id === 'missing') {
      // Both map to the tenants table
      tableName = 'tenants';

      const updates =
        form_id === 'personal'
          ? {
              full_name:        data.full_name        || undefined,
              dob:              data.dob               || undefined,
              nino:             data.nino              || undefined,
              nationality:      data.nationality       || undefined,
              date_entry_uk:    data.date_entry_uk     || null,
              mobile:           data.mobile            || undefined,
              email:            data.email             || null,
              languages:        data.languages         || null,
              address:          data.address           || undefined,
              room_number:      data.room_number       || undefined,
              moved_in:         data.moved_in          || undefined,
              benefit_type:     data.benefit_type      || undefined,
              benefit_freq:     data.benefit_freq      || undefined,
              benefit_amount:   data.benefit_amount    ? parseFloat(data.benefit_amount) : undefined,
              nok_name:         data.nok_name          || undefined,
              nok_relation:     data.nok_relation      || undefined,
              nok_phone:        data.nok_phone         || undefined,
              nok_address:      data.nok_address       || null,
              doctor:           data.doctor            || null,
              probation_officer: data.probation_officer || null,
            }
          : {
              // missing person form
              physical_description:  data.physical_description  || null,
              vehicle_registration:  data.vehicle_registration  || null,
              employer_or_college:   data.employer_or_college   || null,
              status:                'missing' as const,
            };

      const { data: updated, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw new Error(`tenants update: ${error.message}`);
      savedRecord = updated as Record<string, unknown>;
      recordId = tenant_id;

    } else if (form_id === 'privacy') {
      tableName = 'tenants';
      const { data: updated, error } = await supabase
        .from('tenants')
        .update({
          confidentiality_signed:    true,
          confidentiality_signed_at: new Date().toISOString(),
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw new Error(`privacy update: ${error.message}`);
      savedRecord = updated as Record<string, unknown>;
      action = 'SIGN';

    } else if (form_id === 'service') {
      tableName = 'service_charges';
      const weeklyRate = parseFloat(data.weekly_rate ?? '0');
      const now  = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: charge, error } = await supabase
        .from('service_charges')
        .insert({
          tenant_id,
          weekly_rate:    weeklyRate,
          payment_method: data.payment_method || 'Cash',
          effective_from: data.agreement_start_date || periodStart,
          effective_to:   null,
          period_start:   periodStart,
          period_end:     periodEnd,
          amount_due:     Math.round(weeklyRate * 4.33 * 100) / 100,
          amount_paid:    0,
          is_paid:        false,
          recorded_by:    dbUser.id,
          notes:          data.tenant_acknowledgement || null,
        })
        .select()
        .single();

      if (error) throw new Error(`service_charges insert: ${error.message}`);
      savedRecord = charge as Record<string, unknown>;
      recordId = (charge as { id: string }).id;

    } else if (form_id === 'assessment' || form_id === 'risk' || form_id === 'housing') {
      tableName = 'sessions';

      const notesMap: Record<string, string> = {
        assessment: [
          data.risk_level       ? `Risk Level: ${data.risk_level}`             : '',
          data.presenting_needs ? `Presenting Needs:\n${data.presenting_needs}` : '',
          data.support_goals    ? `Support Goals:\n${data.support_goals}`       : '',
          data.assigned_worker  ? `Assigned Key Worker: ${data.assigned_worker}` : '',
          data.review_date      ? `Review Date: ${data.review_date}`            : '',
        ].filter(Boolean).join('\n\n'),

        risk: [
          data.risk_categories  ? `Risk Categories:\n${data.risk_categories}`   : '',
          data.risk_severity    ? `Overall Severity: ${data.risk_severity}`      : '',
          data.mitigation_actions ? `Mitigation Actions:\n${data.mitigation_actions}` : '',
          data.sign_off_name    ? `Sign-Off: ${data.sign_off_name}`             : '',
          data.sign_off_date    ? `Sign-Off Date: ${data.sign_off_date}`        : '',
        ].filter(Boolean).join('\n\n'),

        housing: [
          data.claim_reference  ? `Claim Ref: ${data.claim_reference}`         : '',
          data.claim_type       ? `Claim Type: ${data.claim_type}`             : '',
          data.landlord_name    ? `Landlord: ${data.landlord_name}`            : '',
          data.landlord_account ? `Landlord Account: ${data.landlord_account}` : '',
          data.weekly_rent      ? `Weekly Rent: £${data.weekly_rent}`          : '',
          data.claim_start_date ? `Claim Start: ${data.claim_start_date}`      : '',
          data.assessment_notes ? `Assessment Notes:\n${data.assessment_notes}` : '',
        ].filter(Boolean).join('\n\n'),
      };

      const isRisk = form_id === 'risk' && ['High', 'Critical'].includes(data.risk_severity ?? '');

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:    dbUser.id,
          session_type: 'ad_hoc',
          session_date: new Date().toISOString().split('T')[0],
          notes:        notesMap[form_id] || null,
          entry_method: entryMethod,
          ai_risk_flag: isRisk,
          ai_risk_note: isRisk ? `Risk level ${data.risk_severity ?? ''} flagged on form save` : null,
          is_signed:    stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert: ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId = (session as { id: string }).id;
      action = stamp ? 'VERIFY' : 'EDIT';
    } else {
      return NextResponse.json({ error: `Unknown form_id: ${form_id}` }, { status: 400 });
    }

    // ── Audit log (always on stamp, optional on draft) ────────────────────────

    if (stamp) {
      const { error: auditErr } = await svc
        .from('audit_logs')
        .insert({
          actor_id:    dbUser.id,
          actor_name:  dbUser.full_name,
          actor_role:  dbUser.role,
          tenant_id,
          table_name:  tableName,
          record_id:   recordId,
          action,
          entry_method: entryMethod,
          new_data:    data,
          diff_fields: Object.keys(data),
        });

      if (auditErr) console.error('[audit log]', auditErr.message);
    }

    return NextResponse.json({ ok: true, record: savedRecord });
  } catch (e: unknown) {
    console.error('[forms/save]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Save failed' },
      { status: 500 }
    );
  }
}
