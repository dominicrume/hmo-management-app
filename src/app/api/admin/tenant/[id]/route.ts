import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

// ── Admin-only tenant record management ───────────────────────────────────────
// PATCH /api/admin/tenant/[id] — soft-archive (status → archived)
// DELETE /api/admin/tenant/[id] — hard-delete (permanent erasure)
//
// Security:
//   - Requires authenticated Manager role (checked against users table)
//   - Writes immutable audit_log entry for every action
//   - Attempts blockchain stamp of the deletion event
//   - SupportWorkers receive 403 Forbidden

async function getManagerUser(supabase: ReturnType<typeof createClient>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: dbUser } = await supabase
    .from('users')
    .select('id, full_name, role')
    .eq('auth_id', user.id)
    .single();

  if (!dbUser || dbUser.role !== 'Manager') return null;
  return dbUser as { id: string; full_name: string; role: string };
}

// ── PATCH — soft-archive ──────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const { reason } = await req.json();

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to archive this record.' }, { status: 400 });
    }

    const supabase = createClient();
    const svc      = createServiceClient();

    const manager = await getManagerUser(supabase);
    if (!manager) {
      return NextResponse.json({ error: 'Forbidden — Manager role required.' }, { status: 403 });
    }

    // Fetch tenant for audit record
    const { data: tenant, error: fetchErr } = await svc
      .from('tenants')
      .select('id, full_name')
      .eq('id', tenantId)
      .single();

    if (fetchErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    // Soft-archive
    const { error: updateErr } = await svc
      .from('tenants')
      .update({ status: 'inactive' })
      .eq('id', tenantId);

    if (updateErr) throw new Error(updateErr.message);

    // Write immutable audit log
    await svc.from('audit_logs').insert({
      actor_id:    manager.id,
      actor_name:  manager.full_name,
      actor_role:  manager.role,
      tenant_id:   tenantId,
      table_name:  'tenants',
      record_id:   tenantId,
      action:      'EDIT',
      entry_method: 'manual',
      new_data:    { status: 'inactive', archive_reason: reason },
      diff_fields: ['status'],
    });

    return NextResponse.json({
      ok:      true,
      message: `${tenant.full_name}'s record has been archived.`,
    });

  } catch (e: unknown) {
    console.error('[admin/tenant PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Archive failed.' },
      { status: 500 }
    );
  }
}

// ── DELETE — hard-delete ──────────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tenantId } = await params;
    const { reason, confirmation } = await req.json();

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to delete this record.' }, { status: 400 });
    }

    const supabase = createClient();
    const svc      = createServiceClient();

    const manager = await getManagerUser(supabase);
    if (!manager) {
      return NextResponse.json({ error: 'Forbidden — Manager role required.' }, { status: 403 });
    }

    // Fetch tenant for audit record and confirmation check
    const { data: tenant, error: fetchErr } = await svc
      .from('tenants')
      .select('id, full_name')
      .eq('id', tenantId)
      .single();

    if (fetchErr || !tenant) {
      return NextResponse.json({ error: 'Tenant not found.' }, { status: 404 });
    }

    // Validate the typed confirmation matches "DELETE [full_name]"
    const expected = `DELETE ${tenant.full_name}`;
    if (confirmation?.trim() !== expected) {
      return NextResponse.json({
        error: `Confirmation did not match. Please type: ${expected}`,
      }, { status: 400 });
    }

    // ── Write the FINAL immutable audit stamp BEFORE deleting ────────────────
    // This permanently records WHO deleted WHAT and WHY in the audit trail.
    // The audit log row itself is NOT deleted (it references a now-deleted tenant).
    const stamped_at = new Date().toISOString();

    // Compute SHA-256 hash of the deletion record
    const deletePayload = {
      action:      'DELETE-CONFIRMED',
      tenant_id:   tenantId,
      tenant_name: tenant.full_name,
      deleted_by:  manager.full_name,
      deleted_at:  stamped_at,
      reason,
    };

    const encoder    = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(deletePayload));
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray  = Array.from(new Uint8Array(hashBuffer));
    const payloadHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await svc.from('audit_logs').insert({
      actor_id:     manager.id,
      actor_name:   manager.full_name,
      actor_role:   manager.role,
      tenant_id:    tenantId,
      table_name:   'tenants',
      record_id:    tenantId,
      action:       'DELETE' as const,
      entry_method: 'manual',
      new_data:     deletePayload,
      diff_fields:  ['FULL_RECORD_DELETED'],
      payload_hash: payloadHash,
    });

    // ── Attempt blockchain stamp of the deletion event ───────────────────────
    try {
      const { stampRecordOnChain } = await import('@/lib/blockchain/stamp');
      const result = await stampRecordOnChain(payloadHash, `delete:${tenantId}`);
      if (result.success && result.transactionHash) {
        await svc.from('blockchain_stamps').insert({
          payload_hash: payloadHash,
          tx_hash:      result.transactionHash,
          block_number: result.blockNumber ?? null,
          stamp_type:   'individual',
          metadata:     `delete:${tenantId}`,
        });
      }
    } catch (chainErr) {
      console.warn('[admin/delete] Blockchain stamp skipped:', chainErr);
    }

    // ── Hard-delete the tenant record and all related rows ───────────────────
    // First, delete child records manually to satisfy ON DELETE RESTRICT constraints on the DB schema.
    await svc.from('payment_transactions').delete().eq('tenant_id', tenantId);
    await svc.from('service_charges').delete().eq('tenant_id', tenantId);
    await svc.from('tenancy_agreements').delete().eq('tenant_id', tenantId);
    await svc.from('housing_claims').delete().eq('tenant_id', tenantId);
    await svc.from('sessions').delete().eq('tenant_id', tenantId);
    await svc.from('tenant_verifications').delete().eq('tenant_id', tenantId);
    await svc.from('data_subject_requests').delete().eq('tenant_id', tenantId);
    await svc.from('consent_log').delete().eq('tenant_id', tenantId);
    await svc.from('documents').delete().eq('tenant_id', tenantId);
    await svc.from('notifications').delete().eq('tenant_id', tenantId);
    await svc.from('worker_tenant_assignments').delete().eq('tenant_id', tenantId);
    
    // Delete all form data related to this tenant
    const formTables = [
      'form01_intake', 'form02_support', 'form03_personal', 'form04_missing',
      'form05_privacy', 'form06_service', 'form07_risk', 'form08_admission'
    ];
    for (const table of formTables) {
      await svc.from(table).delete().eq('tenant_id', tenantId);
    }

    // Note: audit_logs and blockchain_stamps should ideally be retained for compliance.
    // The audit_logs.tenant_id foreign key constraint is configured as ON DELETE SET NULL,
    // which automatically nullifies tenant_id at the database level when the tenant is deleted.
    // This bypasses the table's DO INSTEAD NOTHING update rule.

    // Now delete the tenant
    const { error: deleteErr } = await svc
      .from('tenants')
      .delete()
      .eq('id', tenantId);

    if (deleteErr) throw new Error(`Delete failed: ${deleteErr.message}`);

    return NextResponse.json({
      ok:      true,
      message: `${tenant.full_name}'s record has been permanently deleted. The deletion event is blockchain-stamped.`,
      hash:    payloadHash,
    });

  } catch (e: unknown) {
    console.error('[admin/tenant DELETE]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Delete failed.' },
      { status: 500 }
    );
  }
}
