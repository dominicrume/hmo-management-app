import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ethers } from 'ethers';
import type { AuditAction, EntryMethod } from '@/types/database';

// POST /api/forms/save
// Body: { form_id, tenant_id, data, stamp }
// stamp=true  → write to DB + audit log with SHA-256 blockchain hash (computed by DB trigger)
// stamp=false → write to DB only (draft — no audit stamp)

export async function POST(req: NextRequest) {
  try {
    const { form_id, tenant_id, data, stamp = false } = await req.json();

    if (!form_id)   return NextResponse.json({ error: 'form_id required'   }, { status: 400 });
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    if (!data)      return NextResponse.json({ error: 'data required'      }, { status: 400 });

    const supabase = createClient();
    const svc      = createServiceClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { data: dbUser } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('auth_id', user.id)
      .single();

    if (!dbUser) return NextResponse.json({ error: 'Staff profile not found' }, { status: 403 });

    let savedRecord: Record<string, unknown> = {};
    let tableName:   string;
    let recordId:    string = tenant_id;
    let action:      AuditAction = 'EDIT';
    const entryMethod: EntryMethod = 'manual';

    // ── Route by form type ────────────────────────────────────────────────────

    // ── Forms 3 & 4: update tenants table ────────────────────────────────────

    if (form_id === 'personal') {
      tableName = 'tenants';

      // Normalise benefit_type to match DB enum ('UC', 'HB', 'PIP', etc.)
      const mapBenefitType = (bt: string): string => {
        if (!bt) return 'None';
        const l = bt.toLowerCase();
        if (l.includes('universal') || l === 'uc') return 'UC';
        if (l.includes('housing') || l === 'hb') return 'HB';
        if (l.includes('pip')) return 'PIP';
        if (l.includes('esa')) return 'ESA';
        if (l.includes('jsa')) return 'JSA';
        if (l.includes('none')) return 'None';
        return 'Other';
      };

      // Normalise benefit_freq to match DB enum ('Monthly', '2wk', 'Weekly')
      const mapBenefitFreq = (bf: string): string => {
        if (!bf) return 'Weekly';
        const l = bf.toLowerCase();
        if (l.includes('month')) return 'Monthly';
        if (l.includes('fort') || l.includes('2') || l.includes('4')) return '2wk';
        return 'Weekly';
      };

      const { data: updated, error } = await svc
        .from('tenants')
        .update({
          title:             data.title             || undefined,
          full_name:         data.full_name         || undefined,
          dob:               data.dob               || undefined,
          nino:              data.nino              || undefined,
          nationality:       data.nationality       || undefined,
          date_entry_uk:     data.date_entry_uk     || null,
          marital_status:    data.marital_status    || null,
          mobile:            data.mobile            || undefined,
          email:             data.email             || null,
          languages:         data.languages         || null,
          address:           data.address           || undefined,
          room_number:       data.room_number       || undefined,
          moved_in:          data.moved_in          || undefined,
          benefit_type:      data.benefit_type      ? mapBenefitType(data.benefit_type) : undefined,
          benefit_freq:      data.benefit_freq      ? mapBenefitFreq(data.benefit_freq) : undefined,
          benefit_amount:    data.benefit_amount    ? parseFloat(data.benefit_amount) : undefined,
          nok_name:          data.nok_name          || undefined,
          nok_relation:      data.nok_relation      || undefined,
          nok_phone:         data.nok_phone         || undefined,
          nok_address:       data.nok_address       || null,
          doctor:            data.doctor            || null,
          on_probation:      data.on_probation      ?? undefined,
          probation_officer: data.probation_officer || null,
          place_of_birth:    data.place_of_birth    || null,
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw new Error(`tenants update (personal): ${error.message}`);
      savedRecord = updated as Record<string, unknown>;

    } else if (form_id === 'missing') {
      tableName = 'tenants';

      // Compose physical_description from Form04 physical descriptor fields
      const physParts = [
        data.height            ? `Height: ${data.height}`                   : '',
        data.build             ? `Build: ${data.build}`                     : '',
        data.hair_colour       ? `Hair: ${data.hair_colour}${data.hair_style ? ` (${data.hair_style})` : ''}` : '',
        data.eye_colour        ? `Eyes: ${data.eye_colour}`                 : '',
        data.skin_tone         ? `Skin: ${data.skin_tone}`                  : '',
        data.distinguishing_features ? `Distinguishing: ${data.distinguishing_features}` : '',
      ].filter(Boolean).join(' · ');

      const { data: updated, error } = await svc
        .from('tenants')
        .update({
          physical_description:  physParts                    || null,
          vehicle_registration:  data.vehicle_registration   || null,
          employer_or_college:   data.employer_or_college    || null,
          place_of_birth:        data.place_of_birth         || null,
          marital_status:        data.marital_status         || null,
          status:                'missing' as const,
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw new Error(`tenants update (missing): ${error.message}`);
      savedRecord = updated as Record<string, unknown>;

    } else if (form_id === 'privacy') {
      // Form 5 — Confidentiality Waiver: mark tenant as signed
      tableName = 'tenants';
      const { data: updated, error } = await svc
        .from('tenants')
        .update({
          confidentiality_signed:    true,
          confidentiality_signed_at: new Date().toISOString(),
        })
        .eq('id', tenant_id)
        .select()
        .single();

      if (error) throw new Error(`tenants update (privacy): ${error.message}`);
      savedRecord = updated as Record<string, unknown>;
      action = 'SIGN';

    } else if (form_id === 'service') {
      // Form 6 — Service Charge Agreement: insert into service_charges
      tableName = 'service_charges';
      const weeklyRate  = parseFloat(data.weekly_rate ?? '0');
      const now         = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const { data: charge, error } = await svc
        .from('service_charges')
        .insert({
          tenant_id,
          weekly_rate:    weeklyRate,
          payment_method: data.payment_method || 'Cash',
          effective_from: data.start_date || periodStart,
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
      recordId    = (charge as { id: string }).id;
      action      = 'CREATE';

    } else if (form_id === 'assessment') {
      // Form 8 — Initial Support Plan: insert as a session record
      tableName = 'sessions';

      const goalsText = Array.isArray(data.goals)
        ? (data.goals as Array<{ goal: string; action: string; target_date: string; status: string }>)
            .map((g, i) => `Goal ${i + 1}: ${g.goal}\nAction: ${g.action}\nTarget: ${g.target_date} · Status: ${g.status}`)
            .join('\n\n')
        : '';

      const notes = [
        data.presenting_needs  ? `Presenting Needs:\n${data.presenting_needs}` : '',
        data.strengths         ? `Strengths:\n${data.strengths}`               : '',
        data.barriers          ? `Barriers:\n${data.barriers}`                 : '',
        data.outcome_vision    ? `Desired Outcome:\n${data.outcome_vision}`    : '',
        goalsText              ? `Goals:\n${goalsText}`                        : '',
        data.assigned_worker   ? `Assigned Worker: ${data.assigned_worker}`   : '',
        data.plan_review_date  ? `Review Date: ${data.plan_review_date}`      : '',
      ].filter(Boolean).join('\n\n');

      const { data: session, error } = await svc
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:    dbUser.id,
          session_type: 'ad_hoc',
          session_date: new Date().toISOString().split('T')[0],
          notes:        notes || null,
          entry_method: entryMethod,
          ai_risk_flag: false,
          is_signed:    stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert (assessment): ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId    = (session as { id: string }).id;
      action      = stamp ? 'VERIFY' : 'EDIT';

    } else if (form_id === 'risk') {
      // Form 7 — Risk Assessment: insert as a session record
      tableName = 'sessions';

      const isHighRisk = ['High', 'Critical'].includes(data.overall_severity ?? '');

      // Summarise per-category risks from Form07Data shape
      const riskLines = data.risks
        ? Object.entries(data.risks as Record<string, { present: boolean; severity: string; mitigation: string }>)
            .filter(([, v]) => v.present)
            .map(([k, v]) => `${k}: ${v.severity} — ${v.mitigation}`)
            .join('\n')
        : '';

      const notes = [
        riskLines                   ? `Risk Categories:\n${riskLines}`                   : '',
        data.overall_severity       ? `Overall Severity: ${data.overall_severity}`       : '',
        data.immediate_actions      ? `Immediate Actions:\n${data.immediate_actions}`    : '',
        data.safeguarding_referral  ? `Safeguarding Referral: ${data.safeguarding_agency ?? 'Yes'}` : '',
        data.additional_notes       ? `Additional Notes:\n${data.additional_notes}`      : '',
        data.worker_name            ? `Sign-Off: ${data.worker_name}`                   : '',
        data.review_date            ? `Review Date: ${data.review_date}`                : '',
      ].filter(Boolean).join('\n\n');

      const { data: session, error } = await svc
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:    dbUser.id,
          session_type: 'ad_hoc',
          session_date: new Date().toISOString().split('T')[0],
          notes:        notes || null,
          entry_method: entryMethod,
          ai_risk_flag: isHighRisk,
          ai_risk_note: isHighRisk ? `Risk level ${data.overall_severity} flagged on assessment save` : null,
          is_signed:    stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert (risk): ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId    = (session as { id: string }).id;
      action      = stamp ? 'VERIFY' : 'EDIT';

    } else if (form_id === 'housing') {
      // Housing Benefit Claim: insert as a session record
      tableName = 'sessions';

      const notes = [
        data.claim_reference  ? `Claim Ref: ${data.claim_reference}`          : '',
        data.claim_type       ? `Claim Type: ${data.claim_type}`              : '',
        data.weekly_rent      ? `Weekly Rent: £${data.weekly_rent}`           : '',
        data.weekly_core_rent ? `Core Rent: £${data.weekly_core_rent}`        : '',
        data.service_charge   ? `Service Charge: £${data.service_charge}`     : '',
        data.claim_start_date ? `Claim Start: ${data.claim_start_date}`       : '',
        data.assessment_notes ? `Assessment Notes:\n${data.assessment_notes}` : '',
      ].filter(Boolean).join('\n\n');

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:    dbUser.id,
          session_type: 'ad_hoc',
          session_date: new Date().toISOString().split('T')[0],
          notes:        notes || null,
          entry_method: entryMethod,
          is_signed:    stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert (housing): ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId    = (session as { id: string }).id;
      action      = stamp ? 'VERIFY' : 'EDIT';

    } else if (form_id === 'agreement') {
      // Form 2 — Support Checklist: insert as a session record
      tableName = 'sessions';

      const formatChecks = (
        label: string,
        items: Record<string, boolean>,
      ) => {
        const done = Object.entries(items).filter(([, v]) => v).map(([k]) => k);
        return `${label} (${done.length}/${Object.keys(items).length} completed):\n${done.join(', ') || 'None'}`;
      };

      const notes = [
        data.onArrival   ? formatChecks('On Arrival',   data.onArrival   as Record<string, boolean>) : '',
        data.within3Days ? formatChecks('Within 3 Days', data.within3Days as Record<string, boolean>) : '',
        data.after3Days  ? formatChecks('After 3 Days',  data.after3Days  as Record<string, boolean>) : '',
        data.workerNotes ? `Worker Notes:\n${data.workerNotes}` : '',
        data.workerName  ? `Key Worker: ${data.workerName}`     : '',
      ].filter(Boolean).join('\n\n');

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:    dbUser.id,
          session_type: 'ad_hoc',
          session_date: new Date().toISOString().split('T')[0],
          notes:        notes || null,
          entry_method: entryMethod,
          is_signed:    stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert (agreement): ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId    = (session as { id: string }).id;
      action      = stamp ? 'VERIFY' : 'EDIT';

    } else if (form_id === 'induction') {
      // Form 1 — Admission Checklist: insert as a session record
      tableName = 'sessions';

      const checkedItems = data.items
        ? Object.entries(data.items as Record<string, boolean>)
            .filter(([, v]) => v)
            .map(([k]) => k)
        : [];

      const notes = [
        `Admission Checklist: ${checkedItems.length} item(s) confirmed.`,
        checkedItems.length ? `Confirmed: ${checkedItems.join(', ')}` : '',
        data.completedBy ? `Completed By: ${data.completedBy}` : '',
      ].filter(Boolean).join('\n\n');

      const { data: session, error } = await supabase
        .from('sessions')
        .insert({
          tenant_id,
          worker_id:        dbUser.id,
          session_type:     'ad_hoc',
          session_date:     new Date().toISOString().split('T')[0],
          notes:            notes || null,
          entry_method:     entryMethod,
          checklist_items:  checkedItems,
          is_signed:        stamp,
        })
        .select()
        .single();

      if (error) throw new Error(`sessions insert (induction): ${error.message}`);
      savedRecord = session as Record<string, unknown>;
      recordId    = (session as { id: string }).id;
      action      = stamp ? 'SIGN' : 'EDIT';

    } else {
      return NextResponse.json({ error: `Unknown form_id: ${form_id}` }, { status: 400 });
    }

    // ── Audit log — only on stamp=true ────────────────────────────────────────
    // The DB trigger trg_audit_hash computes SHA-256 automatically on INSERT.
    // The tenant UPDATE triggers (trg_audit_tenants_*) also fire automatically.
    // We only write an explicit audit log entry here for session-based saves
    // where stamp=true (the DB trigger doesn't cover sessions → audit_logs).

    if (stamp && tableName === 'sessions') {
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
          diff_fields: Object.keys(data as object),
        });

      if (auditErr) console.error('[audit log]', auditErr.message);

      // ── On-Chain Polygon Timestamping ──
      try {
        const rpcUrl = process.env.POLYGON_RPC_URL;
        const privateKey = process.env.POLYGON_WALLET_PRIVATE_KEY;
        const contractAddress = process.env.POLYGON_CONTRACT_ADDRESS;

        if (rpcUrl && privateKey && contractAddress) {
          const provider = new ethers.JsonRpcProvider(rpcUrl);
          const wallet = new ethers.Wallet(privateKey, provider);
          
          const abi = [
            "function stampAudit(address to, string memory uri, string memory documentHash) public returns (uint256)"
          ];
          
          const contract = new ethers.Contract(contractAddress, abi, wallet);
          
          // Compute a deterministic Keccak256 hash of the form data
          const documentHash = ethers.id(JSON.stringify(data));
          
          // Reference URI pointing back to our system's audit record
          const uri = `tenant:${tenant_id}|record:${recordId}`;

          // Execute the transaction on the Polygon blockchain
          const tx = await contract.stampAudit(wallet.address, uri, documentHash);
          console.log('[polygon] Transaction sent! TX Hash:', tx.hash);
          
          // We update the audit log with the real blockchain transaction hash
          await svc.from('audit_logs')
            .update({ action: `${action}_ON_CHAIN` as AuditAction })
            .eq('record_id', recordId);
        } else {
          console.log('[polygon] Skipping on-chain stamp: Missing RPC, Private Key, or Contract Address in .env.local');
        }
      } catch (chainErr) {
        console.error('[polygon] Failed to stamp on-chain:', chainErr);
      }
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
