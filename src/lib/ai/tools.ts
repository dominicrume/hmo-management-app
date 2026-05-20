// Claude tool definitions + executors.
// Each tool the AI can call has: a schema (sent to Claude) + an execute function.

import OpenAI                  from 'openai';
import { createServiceClient }  from '@/lib/supabase/server';
import { retrieveRelevantSessions } from './memory';

// ── Tool schemas (sent to OpenAI) ─────────────────────────────────────────────

export const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_session_notes',
      description: 'Semantically search past session notes for this tenant. Use when you need to find sessions related to a specific topic or concern.',
      parameters: {
        type: 'object',
        properties: {
          query:    { type: 'string', description: 'What to search for in session notes' },
          top_k:    { type: 'number', description: 'Max results (1–8)', default: 4 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'flag_risk',
      description: 'Formally flag a safeguarding or housing risk for this tenant. Creates a notification to the Manager and records the flag in the audit log.',
      parameters: {
        type: 'object',
        properties: {
          risk_summary: { type: 'string', description: 'Concise description of the risk (1–2 sentences)' },
          severity:     { type: 'string', enum: ['low', 'medium', 'high', 'critical'], description: 'Assessed severity level' },
        },
        required: ['risk_summary', 'severity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_notification',
      description: 'Send an in-app notification to a Manager about this tenant. Use for urgent items that need human attention.',
      parameters: {
        type: 'object',
        properties: {
          title:   { type: 'string', description: 'Short notification title (max 80 chars)' },
          message: { type: 'string', description: 'Notification body (max 300 chars)' },
        },
        required: ['title', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_charge_detail',
      description: 'Retrieve a detailed breakdown of service charges for this tenant, including payment history.',
      parameters: {
        type: 'object',
        properties: {
          unpaid_only: { type: 'boolean', description: 'If true, return only unpaid charges', default: false },
        },
      },
    },
  },
];

// ── Tool executor ─────────────────────────────────────────────────────────────

export interface ToolCallRecord {
  tool:     string;
  input:    Record<string, unknown>;
  output:   unknown;
  durationMs: number;
}

export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: { tenantId: string; workerId: string; managerId?: string },
): Promise<{ result: unknown; record: ToolCallRecord }> {
  const started = Date.now();
  let result: unknown;

  switch (toolName) {
    case 'search_session_notes': {
      const sessions = await retrieveRelevantSessions(
        context.tenantId,
        String(toolInput.query ?? ''),
        Number(toolInput.top_k ?? 4),
      );
      result = sessions.length
        ? sessions.map((s) => `[${s.session_date}] (similarity: ${s.similarity.toFixed(2)})\n${s.notes}`).join('\n\n')
        : 'No semantically similar sessions found.';
      break;
    }

    case 'flag_risk': {
      const svc = createServiceClient();
      // Notify all managers about this risk
      const { data: managers } = await svc
        .from('users')
        .select('id')
        .eq('role', 'Manager')
        .eq('is_active', true);

      if (managers?.length) {
        await svc.from('notifications').insert(
          managers.map((m) => ({
            recipient_id: m.id,
            tenant_id:    context.tenantId,
            type:         'risk_flag',
            title:        `⚠️ AI Risk Flag — ${toolInput.severity?.toString().toUpperCase()}`,
            body:         String(toolInput.risk_summary ?? ''),
            link:         `/dashboard?tenant=${context.tenantId}`,
          }))
        );
      }
      result = { flagged: true, notified_managers: managers?.length ?? 0 };
      break;
    }

    case 'create_notification': {
      const svc = createServiceClient();
      const { data: managers } = await svc
        .from('users')
        .select('id')
        .eq('role', 'Manager')
        .eq('is_active', true);

      if (managers?.length) {
        await svc.from('notifications').insert(
          managers.map((m) => ({
            recipient_id: m.id,
            tenant_id:    context.tenantId,
            type:         'system',
            title:        String(toolInput.title ?? '').slice(0, 120),
            body:         String(toolInput.message ?? '').slice(0, 500),
            link:         `/dashboard?tenant=${context.tenantId}`,
          }))
        );
      }
      result = { sent: true, recipients: managers?.length ?? 0 };
      break;
    }

    case 'get_charge_detail': {
      const svc = createServiceClient();
      let query = svc
        .from('service_charges')
        .select('period_start, period_end, amount_due, amount_paid, is_paid, payment_method, description')
        .eq('tenant_id', context.tenantId)
        .order('period_start', { ascending: false })
        .limit(24);

      if (toolInput.unpaid_only) query = query.eq('is_paid', false);
      const { data } = await query;
      result = data ?? [];
      break;
    }

    default:
      result = { error: `Unknown tool: ${toolName}` };
  }

  return {
    result,
    record: { tool: toolName, input: toolInput, output: result, durationMs: Date.now() - started },
  };
}
