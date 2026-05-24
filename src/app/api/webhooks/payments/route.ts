import { NextRequest, NextResponse } from 'next/server';
import { processPaymentWebhook, type WebhookEvent } from '@/lib/payments/reconciliation';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    
    // In production with a real provider (like TrueLayer or Stripe), 
    // you would verify the signature here to ensure the webhook isn't spoofed.
    if (process.env.NODE_ENV === 'production' && !signature) {
      return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 });
    }

    const body = await req.json();

    // Transform the incoming provider payload into our standardized WebhookEvent.
    // (This example parses our standardized format directly. 
    // If using Stripe, you would map Stripe's fields to these fields).
    const event: WebhookEvent = {
      provider:  body.provider || 'generic',
      paymentId: body.paymentId || body.id,
      reference: body.reference,
      amount:    parseFloat(body.amount),
      currency:  body.currency || 'GBP',
      status:    body.status, // 'succeeded' | 'failed'
      timestamp: body.timestamp || new Date().toISOString(),
    };

    if (!event.reference || isNaN(event.amount)) {
      return NextResponse.json({ error: 'Invalid payload: missing reference or amount' }, { status: 400 });
    }

    const result = await processPaymentWebhook(event);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    return NextResponse.json({ received: true, result });
  } catch (error: any) {
    console.error('[Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
