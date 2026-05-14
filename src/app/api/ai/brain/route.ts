import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the AI Brain for Matty's Place — an expert HMO housing support assistant for Ash Shahada Housing Association Ltd in Birmingham, UK.

You have access to tenant session notes, personal details, risk assessments, and service charge data. Your role is to help support workers and managers by:
- Summarising tenant situations clearly and concisely
- Identifying safeguarding risks and patterns
- Drafting council-ready reports and letters
- Answering questions about specific tenants
- Flagging payment arrears, missed appointments, or behavioural changes

Tone: Professional, empathetic, concise. Never speculate beyond the data provided. If information is missing, say so.
Format: Use markdown for structure when appropriate. Keep responses under 500 words unless a full report is requested.`;

export async function POST(req: NextRequest) {
  try {
    const { tenant_id, worker_id, task, task_type = 'agent_task' } = await req.json();
    if (!task)      return NextResponse.json({ error: 'task required' }, { status: 400 });
    if (!tenant_id) return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });

    const supabase = createServiceClient();

    // Gather all tenant context
    const [{ data: tenant }, { data: sessions }, { data: charges }, { data: verifications }] =
      await Promise.all([
        supabase.from('tenants').select('*').eq('id', tenant_id).single(),
        supabase.from('sessions').select('session_date,session_type,notes,ai_summary,ai_risk_flag,ai_risk_note,checklist_items').eq('tenant_id', tenant_id).order('session_date', { ascending: false }).limit(20),
        supabase.from('service_charges').select('period_start,period_end,amount_due,amount_paid,is_paid,payment_method').eq('tenant_id', tenant_id).order('period_start', { ascending: false }).limit(12),
        supabase.from('tenant_verifications').select('verification_type,signed_at,verified_by_tenant').eq('tenant_id', tenant_id).order('created_at', { ascending: false }).limit(5),
      ]);

    const context = `
## Tenant Record
Name: ${tenant?.full_name} | Room: ${tenant?.room_number} | Status: ${tenant?.status}
DOB: ${tenant?.dob} | NINO: ${tenant?.nino} | Nationality: ${tenant?.nationality}
Move-in: ${tenant?.moved_in} | Brand: ${tenant?.brand}
Benefits: ${tenant?.benefit_type} (${tenant?.benefit_freq}) £${tenant?.benefit_amount}/period
Next of Kin: ${tenant?.nok_name} (${tenant?.nok_relation}) — ${tenant?.nok_phone}
On Probation: ${tenant?.on_probation ? 'YES — Officer: ' + (tenant?.probation_officer ?? 'unknown') : 'No'}
Confidentiality Signed: ${tenant?.confidentiality_signed ? 'Yes' : 'No'}

## Recent Sessions (${sessions?.length ?? 0} records)
${sessions?.map((s) => `[${s.session_date} — ${s.session_type}${s.ai_risk_flag ? ' ⚠️ RISK FLAGGED' : ''}]\n${s.notes ?? s.ai_summary ?? 'No notes.'}`).join('\n\n') ?? 'No sessions recorded.'}

## Service Charges (${charges?.length ?? 0} records)
${charges?.map((c) => `${c.period_start} → ${c.period_end}: £${c.amount_due} due, £${c.amount_paid} paid — ${c.is_paid ? '✅ Paid' : '❌ UNPAID'} (${c.payment_method})`).join('\n') ?? 'No charge records.'}

## Verifications
${verifications?.map((v) => `${v.verification_type} — signed: ${v.signed_at ?? 'Not yet'} — tenant confirmed: ${v.verified_by_tenant}`).join('\n') ?? 'No verifications recorded.'}
`;

    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: `${context}\n\n---\n\nTask: ${task}` },
      ],
    });

    const response = message.content[0].type === 'text' ? message.content[0].text : '';

    // Detect risk flags in the response
    const riskKeywords = ['safeguarding', 'risk', 'concern', 'urgent', 'immediate', 'deteriorat', 'arrears', 'eviction'];
    const isRisk = riskKeywords.some((kw) => response.toLowerCase().includes(kw));

    // Table ai_suggestions does not exist in schema.sql. Skipping insertion to prevent 500 error.
    // We still return the JSON correctly to the frontend.
    console.log('[AI brain] Returning response for task:', task_type);

    return NextResponse.json({ response, risk_detected: isRisk, tokens: message.usage });
  } catch (e: unknown) {
    console.error('[AI brain]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'AI error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
