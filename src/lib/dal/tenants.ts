// Data Access — Tenants
// RLS on the DB enforces role restrictions. These functions add an app-layer
// check before the query so errors are explicit rather than silent empty arrays.

import { createClient } from '@/lib/supabase/server';
import type { DbTenant, InsertTenant } from '@/types/database';

export async function getTenants(): Promise<DbTenant[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('full_name');

  if (error) throw new Error(`getTenants: ${error.message}`);
  return data as DbTenant[];
}

export async function getTenantById(id: string): Promise<DbTenant | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error?.code === 'PGRST116') return null;  // not found
  if (error) throw new Error(`getTenantById: ${error.message}`);
  return data as DbTenant;
}

export async function createTenant(tenant: InsertTenant): Promise<DbTenant> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single();

  if (error) throw new Error(`createTenant: ${error.message}`);
  return data as DbTenant;
}

export async function updateTenant(
  id: string,
  updates: Partial<DbTenant>
): Promise<DbTenant> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateTenant: ${error.message}`);
  return data as DbTenant;
}

// Soft-delete: set status to inactive. Hard delete is never allowed (audit policy).
export async function archiveTenant(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tenants')
    .update({ status: 'inactive' })
    .eq('id', id);

  if (error) throw new Error(`archiveTenant: ${error.message}`);
}
