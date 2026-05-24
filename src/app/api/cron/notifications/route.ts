import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendNotificationEmail, buildOverdueRentTemplate, buildSessionDueTemplate } from '@/lib/notifications/email';

export async function GET(req: NextRequest) {
  // 1. Security Check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  const results = { rent_overdue: 0, session_due: 0, errors: [] as string[] };

  try {
    const now = new Date();

    // ========================================================================
    // 2. SCAN FOR RENT ARREARS (OVERDUE SERVICE CHARGES)
    // ========================================================================
    // Note: To simplify typing, we'll fetch charges then fetch the related tenants
    const { data: charges, error: chargesErr } = await svc
      .from('service_charges')
      .select('*')
      .eq('is_paid', false);

    if (chargesErr) throw chargesErr;

    const overdueCharges = (charges || []).filter(c => new Date(c.period_end) < now);

    if (overdueCharges.length > 0) {
      // Find Managers to notify
      const { data: managers } = await svc.from('users').select('*').eq('role', 'Manager');
      const manager = managers?.[0]; // Notify the primary manager

      if (manager) {
        for (const charge of overdueCharges) {
          // Fetch the tenant for this charge
          const { data: tenant } = await svc.from('tenants').select('full_name, status').eq('id', charge.tenant_id).single();
          
          if (tenant && tenant.status === 'active') {
            // Prevent spam: Check if notification already exists for this tenant & charge type in the last 7 days
            const { data: existing } = await svc.from('notifications')
              .select('id')
              .eq('recipient_id', manager.id)
              .eq('tenant_id', charge.tenant_id)
              .eq('type', 'rent_overdue')
              .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .limit(1);

            if (!existing || existing.length === 0) {
              await svc.from('notifications').insert({
                recipient_id: manager.id,
                tenant_id: charge.tenant_id,
                type: 'rent_overdue',
                title: 'Rent Overdue',
                body: `${tenant.full_name} is overdue for £${charge.amount_due}`,
                link: '/dashboard?view=ledger'
              });

              await sendNotificationEmail({
                to: manager.email,
                subject: `Rent Overdue: ${tenant.full_name}`,
                html: buildOverdueRentTemplate(tenant.full_name, charge.amount_due)
              });

              results.rent_overdue++;
            }
          }
        }
      }
    }

    // ========================================================================
    // 3. SCAN FOR MISSED WEEKLY ROOM CHECKS (SESSIONS)
    // ========================================================================
    // Get all active tenants
    const { data: tenants, error: tenantsErr } = await svc
      .from('tenants')
      .select('*')
      .eq('status', 'active');
      
    if (tenantsErr) throw tenantsErr;

    if (tenants && tenants.length > 0) {
      for (const tenant of tenants) {
        if (!tenant.assigned_worker_id) continue;

        // Get most recent session
        const { data: sessions } = await svc
          .from('sessions')
          .select('session_date')
          .eq('tenant_id', tenant.id)
          .order('session_date', { ascending: false })
          .limit(1);

        let daysSince = 999;
        if (sessions && sessions.length > 0) {
          const lastDate = new Date(sessions[0].session_date);
          daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        if (daysSince > 7) {
          // Fetch the assigned support worker
          const { data: worker } = await svc.from('users').select('email, id').eq('id', tenant.assigned_worker_id).single();
          
          if (worker) {
            // Prevent spam: Don't notify more than once every 3 days for the same tenant
            const { data: existing } = await svc.from('notifications')
              .select('id')
              .eq('recipient_id', worker.id)
              .eq('tenant_id', tenant.id)
              .eq('type', 'session_due')
              .gte('created_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()) 
              .limit(1);

            if (!existing || existing.length === 0) {
               await svc.from('notifications').insert({
                recipient_id: worker.id,
                tenant_id: tenant.id,
                type: 'session_due',
                title: 'Room Check Overdue',
                body: `${tenant.full_name} has not had a session in ${daysSince} days.`,
                link: `/dashboard?view=session&tenant=${tenant.id}`
              });

              await sendNotificationEmail({
                to: worker.email,
                subject: `Room Check Overdue: ${tenant.full_name}`,
                html: buildSessionDueTemplate(tenant.full_name, daysSince)
              });

              results.session_due++;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[CRON Error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
