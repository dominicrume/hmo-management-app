// Data Access — Sessions

import { createClient } from '@/lib/supabase/server';
import type { DbSession, InsertSession } from '@/types/database';

export async function getSessionsForTenant(tenantId: string): Promise<DbSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('session_date', { ascending: false });

  if (error) throw new Error(`getSessionsForTenant: ${error.message}`);
  return data as DbSession[];
}

export async function getRecentSessions(limit = 10): Promise<DbSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .select('*, tenants(full_name, room_number)')
    .order('session_date', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getRecentSessions: ${error.message}`);
  return data as DbSession[];
}

export async function createSession(session: InsertSession): Promise<DbSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw new Error(`createSession: ${error.message}`);
  return data as DbSession;
}

export async function updateSession(
  id: string,
  updates: Partial<DbSession>
): Promise<DbSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateSession: ${error.message}`);
  return data as DbSession;
}
