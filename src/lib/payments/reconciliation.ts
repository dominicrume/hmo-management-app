import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/observability/logger';

export interface WebhookEvent {
  provider: string; // e.g. 'stripe', 'gocardless', 'truelayer', 'mock'
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed';
  timestamp: string;
}

export async function processPaymentWebhook(event: WebhookEvent) {
  const svc = createServiceClient();
  
  // 1. Validate Event
  if (event.status !== 'succeeded') {
    void log.info('Ignoring non-succeeded payment webhook', { meta: { event } });
    return { success: true, ignored: true, reason: 'status not succeeded' };
  }

  // 2. Find Tenant by Reference Code
  // Expected format: TEN-XXXXXXXX where XXXXXXXX is the first 8 chars of the UUID
  if (!event.reference || !event.reference.startsWith('TEN-')) {
    return { success: false, error: 'Invalid reference code format. Must start with TEN-' };
  }
  const shortId = event.reference.replace('TEN-', '').toLowerCase();

  // Find the tenant (Supabase doesn't natively do "starts_with" on UUID, 
  // but we can query active tenants and match in memory if there aren't too many, 
  // or we can use a raw SQL RPC if needed. Given HMO scale, we fetch all active or use text cast).
  // For simplicity and safety at this scale:
  const { data: tenants, error: tenantsErr } = await svc
    .from('tenants')
    .select('id, full_name');
    
  if (tenantsErr) throw tenantsErr;
  
  const tenant = tenants?.find(t => t.id.startsWith(shortId));
  
  if (!tenant) {
    return { success: false, error: 'Tenant not found for reference ' + event.reference };
  }

  // 3. Find the oldest unpaid service charge for this tenant
  const { data: charges, error: chargesErr } = await svc
    .from('service_charges')
    .select('*')
    .eq('tenant_id', tenant.id)
    .eq('is_paid', false)
    .order('period_start', { ascending: true });

  if (chargesErr) throw chargesErr;

  if (!charges || charges.length === 0) {
    // Record payment anyway as overpayment / credit (for v2)
    // For now, just log transaction
    await svc.from('payment_transactions').insert({
      tenant_id: tenant.id,
      txn_type: 'service_charge',
      txn_status: 'completed',
      amount: event.amount,
      payment_method: 'Bank Transfer',
      payment_date: event.timestamp,
      reference: event.provider + ':' + event.paymentId,
      notes: 'Overpayment / Unallocated funds',
      recorded_by: 'system',
    });
    return { success: true, message: 'Recorded as unallocated payment (no unpaid charges)' };
  }

  // We allocate the payment to the oldest unpaid charge first
  // Simple allocation logic: pay off exactly one charge if amounts match, or just apply it.
  // In a real accounting engine we'd loop through and decrement the remainder. 
  // For this version, we'll apply it to the first charge.
  const chargeToPay = charges[0];
  const newAmountPaid = (chargeToPay.amount_paid || 0) + event.amount;
  const isPaid = newAmountPaid >= chargeToPay.amount_due;

  // 4. Update the Ledger
  const { error: updateErr } = await svc
    .from('service_charges')
    .update({
      amount_paid: newAmountPaid,
      is_paid: isPaid,
      paid_at: isPaid ? event.timestamp : chargeToPay.paid_at,
      payment_ref: event.provider + ':' + event.paymentId,
    })
    .eq('id', chargeToPay.id);

  if (updateErr) throw updateErr;

  // 5. Create Transaction Record
  const { error: txnErr } = await svc.from('payment_transactions').insert({
    tenant_id: tenant.id,
    charge_id: chargeToPay.id,
    txn_type: 'service_charge',
    txn_status: 'completed',
    amount: event.amount,
    payment_method: 'Bank Transfer',
    payment_date: event.timestamp,
    reference: event.provider + ':' + event.paymentId,
    notes: 'Auto-reconciled via Webhook',
    recorded_by: 'system',
  });

  if (txnErr) throw txnErr;

  // 6. Notify the Manager
  const { data: managers } = await svc.from('users').select('id').eq('role', 'Manager');
  if (managers && managers.length > 0) {
    await svc.from('notifications').insert({
      recipient_id: managers[0].id,
      tenant_id: tenant.id,
      type: 'payment',
      title: 'Payment Auto-Reconciled',
      body: `£${event.amount.toFixed(2)} received for ${tenant.full_name}. Ledger updated.`,
      link: '/dashboard?view=ledger'
    });
  }

  // 7. Audit Log
  await svc.from('audit_logs').insert({
    actor_id: '00000000-0000-0000-0000-000000000000', // System user
    actor_name: 'Webhook System',
    actor_role: 'Manager', // Elevated permissions
    tenant_id: tenant.id,
    table_name: 'service_charges',
    record_id: chargeToPay.id,
    action: 'EDIT',
    entry_method: 'manual',
    new_data: { is_paid: isPaid, amount_paid: newAmountPaid },
    diff_fields: ['is_paid', 'amount_paid'],
  });

  return { 
    success: true, 
    message: `Payment applied to charge ${chargeToPay.id}. Fully paid: ${isPaid}` 
  };
}
