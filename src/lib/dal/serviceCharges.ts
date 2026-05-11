// Data Access — Service Charges
// Manager: full CRUD. SupportWorker: SELECT only (enforced by RLS).

import { createClient } from '@/lib/supabase/server';
import type { DbServiceCharge, InsertServiceCharge } from '@/types/database';

export async function getChargesForTenant(tenantId: string): Promise<DbServiceCharge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_charges')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('period_start', { ascending: false });

  if (error) throw new Error(`getChargesForTenant: ${error.message}`);
  return data as DbServiceCharge[];
}

export async function getUnpaidCharges(): Promise<DbServiceCharge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_charges')
    .select('*, tenants(full_name, room_number)')
    .eq('is_paid', false)
    .order('period_start');

  if (error) throw new Error(`getUnpaidCharges: ${error.message}`);
  return data as DbServiceCharge[];
}

export async function createCharge(charge: InsertServiceCharge): Promise<DbServiceCharge> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_charges')
    .insert(charge)
    .select()
    .single();

  if (error) throw new Error(`createCharge: ${error.message}`);
  return data as DbServiceCharge;
}

// Toggle is_paid — Manager only (RLS blocks SupportWorker UPDATE).
export async function toggleChargePaid(
  id: string,
  isPaid: boolean
): Promise<DbServiceCharge> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_charges')
    .update({
      is_paid:  isPaid,
      paid_at:  isPaid ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`toggleChargePaid: ${error.message}`);
  return data as DbServiceCharge;
}
