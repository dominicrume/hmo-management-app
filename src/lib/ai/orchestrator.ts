// AI Orchestrator — the single entry point for all AI interactions.
//
// Flow:
//   buildTenantContext → getRecentMemory → retrieveRelevantSessions (RAG)
//   → callClaude (with tool calling loop) → verifyResponse
//   → storeMemory → storeAiSuggestion → writeAuditLog → return

import Anthropic               from '@anthropic-ai/sdk';
import { buildTenantContext, formatContextBlock } from './context';
import { getRecentMemory, storeMemoryTurn, retrieveRelevantSessions } from './memory';
import { TOOL_DEFINITIONS, executeTool, type ToolCallRecord } from './tools';
import { verifyResponse }      from './verifier';
import { BRAIN_SYSTEM_PROMPT } from './prompts';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog }       from '@/lib/dal/auditLogs';
import { log }                 from '@/lib/observability/logger';

const CLAUDE_BRAIN_MODEL   = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS      = 5; // prevent infinite loops

export interface OrchestratorParams {
  tenantId:   string;
  workerId:   string;
  actorName:  string;
  actorRole:  string;
  task:       string;
  taskType?:  string;
  sessionKey?: string; // pass to maintain multi-turn memory; omit for one-shot
}

export interface OrchestratorResult {
  response:      string;
  riskDetected:  boolean;
  riskSummary?:  string;
  toolCalls:     ToolCallRecord[];
  verification:  ReturnType<typeof verifyResponse>;
  tokensUsed:    number;
  model:         string;
  latencyMs:     number;
}

export async function runAITask(params: OrchestratorParams): Promise<OrchestratorResult> {
  const started    = Date.now();
  const anthropic  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sessionKey = params.sessionKey ?? `${new Date().toISOString().split('T')[0]}-brain`;

  // ── 1. Build tenant context ───────────────────────────────────────────────
  const ctx          = await buildTenantContext(params.tenantId);
  const contextBlock = formatContextBlock(ctx);

  // ── 2. RAG — retrieve semantically relevant sessions ──────────────────────
  const ragSessions = await retrieveRelevantSessions(params.tenantId, params.task, 4);
  const ragBlock     = ragSessions.length
    ? `\n\n## Semantically Relevant Past Sessions (RAG)\n${ragSessions.map((s) =>
        `[${s.session_date}] ${s.notes}`
      ).join('\n\n')}`
    : '';

  // ── 3. Load conversation memory ───────────────────────────────────────────
  const pastTurns = await getRecentMemory(params.tenantId, params.workerId, sessionKey);

  // ── 4. Build Claude message list ──────────────────────────────────────────
  const userContent = `${contextBlock}${ragBlock}\n\n---\n\nTask: ${params.task}`;

  const messages: Anthropic.MessageParam[] = [
    ...pastTurns.map((t): Anthropic.MessageParam => ({
      role:    t.role,
      content: t.content,
    })),
    { role: 'user', content: userContent },
  ];

  // ── 5. Claude call with tool calling loop ─────────────────────────────────
  const allToolCalls: ToolCallRecord[] = [];
  let   totalTokens = 0;
  let   finalResponse = '';
  let   rounds = 0;

  let claudeResponse = await anthropic.messages.create({
    model:      CLAUDE_BRAIN_MODEL,
    max_tokens: 1500,
    system:     BRAIN_SYSTEM_PROMPT,
    tools:      TOOL_DEFINITIONS,
    messages,
  });

  totalTokens += claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens;

  while (claudeResponse.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const toolUseBlocks = claudeResponse.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    );

    // Execute all requested tools
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolBlock of toolUseBlocks) {
      const { result, record } = await executeTool(
        toolBlock.name,
        toolBlock.input as Record<string, unknown>,
        { tenantId: params.tenantId, workerId: params.workerId },
      );
      allToolCalls.push(record);
      toolResults.push({
        type:        'tool_result',
        tool_use_id: toolBlock.id,
        content:     JSON.stringify(result),
      });
    }

    // Continue conversation with tool results
    messages.push({ role: 'assistant', content: claudeResponse.content });
    messages.push({ role: 'user',      content: toolResults });

    claudeResponse = await anthropic.messages.create({
      model:      CLAUDE_BRAIN_MODEL,
      max_tokens: 1500,
      system:     BRAIN_SYSTEM_PROMPT,
      tools:      TOOL_DEFINITIONS,
      messages,
    });
    totalTokens += claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens;
  }

  // Extract final text response
  const textBlock = claudeResponse.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  finalResponse   = textBlock?.text ?? '';

  // ── 6. Verify response ────────────────────────────────────────────────────
  const verification = verifyResponse(finalResponse, contextBlock);

  if (!verification.passed || verification.warnings.length > 0) {
    void log.warn('AI response verification issues', {
      route: '/api/ai/brain',
      actorId: params.workerId,
      meta: { piiFlags: verification.piiFlags, warnings: verification.warnings },
    });
  }

  // ── 7. Risk detection ─────────────────────────────────────────────────────
  const RISK_KEYWORDS = ['safeguarding', 'risk', 'urgent', 'immediate', 'deteriorat', 'arrears', 'eviction', 'concern'];
  const riskDetected  = RISK_KEYWORDS.some((kw) => finalResponse.toLowerCase().includes(kw))
    || allToolCalls.some((tc) => tc.tool === 'flag_risk');
  const riskSummary   = riskDetected
    ? allToolCalls.find((tc) => tc.tool === 'flag_risk')?.input?.risk_summary as string | undefined
    : undefined;

  const latencyMs = Date.now() - started;

  // ── 8. Store conversation memory ──────────────────────────────────────────
  await storeMemoryTurn({ tenantId: params.tenantId, workerId: params.workerId, sessionKey, role: 'user',      content: params.task });
  await storeMemoryTurn({ tenantId: params.tenantId, workerId: params.workerId, sessionKey, role: 'assistant', content: finalResponse, tokens: totalTokens });

  // ── 9. Persist to ai_suggestions ──────────────────────────────────────────
  try {
    const svc = createServiceClient();
    await svc.from('ai_suggestions').insert({
      tenant_id:     params.tenantId,
      worker_id:     params.workerId,
      task_type:     params.taskType ?? 'brain',
      session_key:   sessionKey,
      response:      finalResponse,
      risk_detected: riskDetected,
      risk_summary:  riskSummary ?? null,
      tool_calls:    allToolCalls.length ? allToolCalls : null,
      verified:      verification.passed,
      verification,
      tokens_used:   totalTokens,
      model:         CLAUDE_BRAIN_MODEL,
      latency_ms:    latencyMs,
    });
  } catch (e) {
    void log.warn('Failed to store ai_suggestion', { meta: { error: String(e) } });
  }

  // ── 10. Audit log ─────────────────────────────────────────────────────────
  try {
    await writeAuditLog({
      actorId:   params.workerId,
      actorName: params.actorName,
      actorRole: params.actorRole as 'Manager' | 'SupportWorker' | 'Tenant',
      tenantId:  params.tenantId,
      tableName: 'ai_suggestions',
      recordId:  params.tenantId,
      action:    'CREATE',
      entryMethod: 'manual',
      newData: { task_type: params.taskType, risk_detected: riskDetected, tokens: totalTokens },
    });
  } catch {
    // Never let audit failure block AI response
  }

  return { response: finalResponse, riskDetected, riskSummary, toolCalls: allToolCalls, verification, tokensUsed: totalTokens, model: CLAUDE_BRAIN_MODEL, latencyMs };
}
