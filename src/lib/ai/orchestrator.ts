// AI Orchestrator — the single entry point for all AI interactions.
//
// Flow:
//   buildTenantContext → getRecentMemory → retrieveRelevantSessions (RAG)
//   → callClaude (with tool calling loop) → verifyResponse
//   → storeMemory → storeAiSuggestion → writeAuditLog → return

import type OpenAI from 'openai';
import type Anthropic from '@anthropic-ai/sdk';
import { buildTenantContext, formatContextBlock } from './context';
import { getRecentMemory, storeMemoryTurn, retrieveRelevantSessions } from './memory';
import { TOOL_DEFINITIONS, executeTool, type ToolCallRecord } from './tools';
import { verifyResponse }      from './verifier';
import { BRAIN_SYSTEM_PROMPT } from './prompts';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog }       from '@/lib/dal/auditLogs';
import { log }                 from '@/lib/observability/logger';
import { checkInputGuardrails, checkOutputGuardrails, AI_DISCLAIMER, classifyAIRisk, requiresHumanApproval } from '@/lib/compliance';

const CLAUDE_BRAIN_MODEL   = 'gpt-4o';
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
  guardrails:    { input: ReturnType<typeof checkInputGuardrails>; output: ReturnType<typeof checkOutputGuardrails> };
  aiRiskClass:   string;
  requiresApproval: boolean;
  approvalId?:   string;
}

export async function runAITask(params: OrchestratorParams): Promise<OrchestratorResult> {
  const started    = Date.now();
  const sessionKey = params.sessionKey ?? `${new Date().toISOString().split('T')[0]}-brain`;

  // ── 0. Input guardrails (EU AI Act Art. 9) ───────────────────────────────
  const taskType      = params.taskType ?? 'brain';
  const inputGuard    = checkInputGuardrails(params.task);
  const aiRiskProfile = classifyAIRisk(taskType);

  if (!inputGuard.allowed) {
    const latencyMs = Date.now() - started;
    const blocked   = `Request blocked by AI guardrails: ${inputGuard.flags.join('; ')}`;
    return {
      response:         blocked,
      riskDetected:     false,
      toolCalls:        [],
      verification:     { passed: false, warnings: inputGuard.flags, piiFlags: [], grounded: false },
      tokensUsed:       0,
      model:            'none',
      latencyMs,
      guardrails:       { input: inputGuard, output: checkOutputGuardrails('', taskType, false) },
      aiRiskClass:      aiRiskProfile.classification,
      requiresApproval: false,
    };
  }

  // ── Check AI API key availability ─────────────────────────────────────────
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAIKey    = !!process.env.OPENAI_API_KEY;

  if (!hasAnthropicKey && !hasOpenAIKey) {
    const latencyMs = Date.now() - started;
    return {
      response: '⚠️ **AI Brain is not yet configured.**\n\nNo AI API key has been set. To activate the AI Brain:\n\n1. Get an API key from [Anthropic](https://console.anthropic.com) (recommended) or [OpenAI](https://platform.openai.com)\n2. Add `ANTHROPIC_API_KEY=your-key` to your `.env.local` file\n3. Restart the development server\n\nAll other features (forms, saving, audit trail) work independently of the AI Brain.',
      riskDetected:     false,
      toolCalls:        [],
      verification:     { passed: true, warnings: [], piiFlags: [], grounded: false },
      tokensUsed:       0,
      model:            'none',
      latencyMs,
      guardrails:       { input: inputGuard, output: checkOutputGuardrails('', taskType, false) },
      aiRiskClass:      aiRiskProfile.classification,
      requiresApproval: false,
    };
  }

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

  // ── 4. Build message list ─────────────────────────────────────────────────
  const userContent = `${contextBlock}${ragBlock}\n\n---\n\nTask: ${params.task}`;

  // ── 5. Call OpenAI ───────────────────────────────
  let finalResponse = '';
  let totalTokens   = 0;
  const allToolCalls: ToolCallRecord[] = [];
  const usedModel = 'gpt-4o';

  // ── OpenAI path ────────────────────────────────────────────────────────
  const OpenAI = (await import('openai')).default;
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: BRAIN_SYSTEM_PROMPT },
    ...pastTurns.map((t): OpenAI.Chat.ChatCompletionMessageParam => ({
      role:    t.role as 'user' | 'assistant',
      content: t.content,
    })),
    { role: 'user', content: userContent },
  ];

    let response = await openai.chat.completions.create({
      model:       usedModel,
      temperature: 0.2,
      messages,
      tools:       TOOL_DEFINITIONS,
    });

    totalTokens += response.usage?.total_tokens ?? 0;
    let choice = response.choices[0];
    let assistantMessage = choice.message;
    let rounds = 0;

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && rounds < MAX_TOOL_ROUNDS) {
      rounds++;
      messages.push(assistantMessage);
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== 'function') continue;
        const tc = toolCall as { function: { name: string; arguments: string }; id: string; type: string };
        let toolInput: Record<string, unknown> = {};
        try { toolInput = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
        const { result, record } = await executeTool(tc.function.name, toolInput, { tenantId: params.tenantId, workerId: params.workerId });
        allToolCalls.push(record);
        messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(result) });
      }
      response = await openai.chat.completions.create({ model: usedModel, temperature: 0.2, messages, tools: TOOL_DEFINITIONS });
      totalTokens += response.usage?.total_tokens ?? 0;
      choice = response.choices[0];
      assistantMessage = choice.message;
    }
    finalResponse = assistantMessage.content ?? '';

  const CLAUDE_BRAIN_MODEL = usedModel;

  // ── 6. Verify response ────────────────────────────────────────────────────
  const verification = verifyResponse(finalResponse, contextBlock);

  if (!verification.passed || verification.warnings.length > 0) {
    void log.warn('AI response verification issues', {
      route: '/api/ai/brain',
      actorId: params.workerId,
      meta: { piiFlags: verification.piiFlags, warnings: verification.warnings },
    });
  }

  // ── 6b. Output guardrails (EU AI Act Art. 9) ─────────────────────────────
  const RISK_KEYWORDS = ['safeguarding', 'risk', 'urgent', 'immediate', 'deteriorat', 'arrears', 'eviction', 'concern'];
  const riskDetected  = RISK_KEYWORDS.some((kw) => finalResponse.toLowerCase().includes(kw))
    || allToolCalls.some((tc) => tc.tool === 'flag_risk');
  const outputGuard   = checkOutputGuardrails(finalResponse, taskType, riskDetected);

  // Append AI disclaimer if required (high-risk task type or risk detected)
  if (outputGuard.requiresDisclaimer) finalResponse += AI_DISCLAIMER;

  const riskSummary = riskDetected
    ? allToolCalls.find((tc) => tc.tool === 'flag_risk')?.input?.risk_summary as string | undefined
    : undefined;

  const latencyMs = Date.now() - started;

  // ── 7. Human approval gate (EU AI Act Art. 14) ───────────────────────────
  const needsApproval = requiresHumanApproval(taskType, riskSummary ? 'high' : undefined);
  let   approvalId: string | undefined;

  if (needsApproval && riskDetected) {
    try {
      const svc = createServiceClient();
      const { data: approval } = await svc.from('ai_approvals').insert({
        tenant_id:     params.tenantId,
        risk_summary:  riskSummary ?? 'AI detected risk — review required',
        risk_severity: 'high',
        ai_model:      CLAUDE_BRAIN_MODEL,
        ai_confidence: outputGuard.confidence,
      }).select('id').single();
      approvalId = approval?.id;
    } catch { /* non-fatal */ }
  }

  // ── 8. Store conversation memory ──────────────────────────────────────────
  await storeMemoryTurn({ tenantId: params.tenantId, workerId: params.workerId, sessionKey, role: 'user',      content: params.task });
  await storeMemoryTurn({ tenantId: params.tenantId, workerId: params.workerId, sessionKey, role: 'assistant', content: finalResponse, tokens: totalTokens });

  // ── 9. Persist ai_suggestion + explainability record ─────────────────────
  try {
    const svc = createServiceClient();
    const { data: suggestion } = await svc.from('ai_suggestions').insert({
      tenant_id:     params.tenantId,
      worker_id:     params.workerId,
      task_type:     taskType,
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
    }).select('id').single();

    // Explainability log (EU AI Act Art. 13)
    if (suggestion?.id) {
      await svc.from('ai_decision_log').insert({
        suggestion_id:   suggestion.id,
        tenant_id:       params.tenantId,
        model:           CLAUDE_BRAIN_MODEL,
        task_type:       taskType,
        context_summary: `${ctx.sessions.length} sessions, ${ctx.charges.length} charges, ${ctx.claims.length} claims loaded`,
        tools_invoked:   allToolCalls.map((t) => t.tool),
        verification,
        risk_class:      aiRiskProfile.classification,
        guardrail_flags: [...inputGuard.flags, ...outputGuard.flags],
        latency_ms:      latencyMs,
      });
    }
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
      newData: { task_type: taskType, risk_detected: riskDetected, tokens: totalTokens, risk_class: aiRiskProfile.classification },
    });
  } catch {
    // Never let audit failure block AI response
  }

  return {
    response: finalResponse, riskDetected, riskSummary,
    toolCalls: allToolCalls, verification,
    tokensUsed: totalTokens, model: CLAUDE_BRAIN_MODEL, latencyMs,
    guardrails:      { input: inputGuard, output: outputGuard },
    aiRiskClass:     aiRiskProfile.classification,
    requiresApproval: needsApproval && riskDetected,
    approvalId,
  };
}
