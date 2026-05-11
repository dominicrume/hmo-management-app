// Data Access — Audit Logs
// Append-only — never UPDATE or DELETE.
// The DB trigger computes SHA-256 payload_hash on INSERT automatically.

import { createServiceClient } from '@/lib/supabase/server';
import type { DbAuditLog, AuditAction, EntryMethod, UserRole } from '@/types/database';

interface WriteAuditParams {
  actorId:      string;
  actorName:    string;
  actorRole:    UserRole;
  tenantId?:    string;
  tableName:    string;
  recordId:     string;
  action:       AuditAction;
  entryMethod?: EntryMethod;
  oldData?:     Record<string, unknown>;
  newData?:     Record<string, unknown>;
  diffFields?:  string[];
}

// Uses service-role client — audit writes must not be blocked by RLS.
export async function writeAuditLog(params: WriteAuditParams): Promise<DbAuditLog> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .insert({
      actor_id:     params.actorId,
      actor_name:   params.actorName,
      actor_role:   params.actorRole,
      tenant_id:    params.tenantId ?? null,
      table_name:   params.tableName,
      record_id:    params.recordId,
      action:       params.action,
      entry_method: params.entryMethod ?? 'manual',
      old_data:     params.oldData   ?? null,
      new_data:     params.newData   ?? null,
      diff_fields:  params.diffFields ?? null,
      // payload_hash is computed by the DB trigger — do not pass it here
    })
    .select()
    .single();

  if (error) throw new Error(`writeAuditLog: ${error.message}`);
  return data as DbAuditLog;
}

export async function getAuditLogsForTenant(tenantId: string): Promise<DbAuditLog[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('stamped_at', { ascending: false });

  if (error) throw new Error(`getAuditLogsForTenant: ${error.message}`);
  return data as DbAuditLog[];
}

export async function getRecentAuditLogs(limit = 50): Promise<DbAuditLog[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('stamped_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentAuditLogs: ${error.message}`);
  return data as DbAuditLog[];
}
