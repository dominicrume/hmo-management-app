import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function sendNotificationEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!resend) {
    console.log(`[Email Skipped] No RESEND_API_KEY found. Would have sent: "${subject}" to ${to}`);
    return { success: true, skipped: true };
  }

  try {
    // Note: To use a custom domain, you must verify it in the Resend dashboard.
    // Using a verified domain like mattysplace.org.uk
    const data = await resend.emails.send({
      from: 'Matty\'s Place Notifications <notifications@mattysplace.org.uk>',
      to,
      subject,
      html,
    });
    return { success: true, data };
  } catch (error) {
    console.error('[Email Error]', error);
    return { success: false, error };
  }
}

export function buildOverdueRentTemplate(tenantName: string, amountDue: number) {
  return `
    <div style="font-family: sans-serif; color: #0F1C2E; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0F1C2E; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Rent Overdue Alert</h2>
      </div>
      <div style="padding: 20px; background-color: #F8F4EF;">
        <p><strong>Action Required:</strong></p>
        <p>The tenant <strong>${tenantName}</strong> has an overdue service charge.</p>
        <p><strong>Amount Due:</strong> £${amountDue.toFixed(2)}</p>
        <p>Please check the Service Charge Ledger in the dashboard and follow up with the tenant.</p>
        <a href="https://app.mattysplace.org.uk/dashboard" style="display: inline-block; background-color: #E8A84C; color: #0F1C2E; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px;">View Dashboard</a>
      </div>
    </div>
  `;
}

export function buildSessionDueTemplate(tenantName: string, daysSince: number) {
  return `
    <div style="font-family: sans-serif; color: #0F1C2E; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0F1C2E; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Session Overdue Alert</h2>
      </div>
      <div style="padding: 20px; background-color: #F8F4EF;">
        <p><strong>Action Required:</strong></p>
        <p>The tenant <strong>${tenantName}</strong> has not had a weekly room check session logged in ${daysSince} days.</p>
        <p>Please ensure you complete a room check and log the session in the dashboard as soon as possible.</p>
        <a href="https://app.mattysplace.org.uk/dashboard" style="display: inline-block; background-color: #E8A84C; color: #0F1C2E; font-weight: bold; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Log Session</a>
      </div>
    </div>
  `;
}
