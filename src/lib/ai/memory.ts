// AI Memory layer — conversation continuity + RAG retrieval.
// Reads/writes ai_memory and session_embeddings tables.

import { createServiceClient } from '@/lib/supabase/server';
import OpenAI                  from 'openai';

const MEMORY_WINDOW = 10; // max turns to include in context

export interface MemoryTurn {
  role:    'user' | 'assistant';
  content: string;
}

// ── Short-term memory: conversation turns ─────────────────────────────────────

export async function getRecentMemory(
  tenantId:   string,
  workerId:   string,
  sessionKey: string,
): Promise<MemoryTurn[]> {
  const svc = createServiceClient();
  const { data } = await svc
    .from('ai_memory')
    .select('role, content')
    .eq('tenant_id',   tenantId)
    .eq('worker_id',   workerId)
    .eq('session_key', sessionKey)
    .order('created_at', { ascending: true })
    .limit(MEMORY_WINDOW);

  return (data ?? []) as MemoryTurn[];
}

export async function storeMemoryTurn(params: {
  tenantId:   string;
  workerId:   string;
  sessionKey: string;
  role:       'user' | 'assistant';
  content:    string;
  tokens?:    number;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from('ai_memory').insert({
    tenant_id:   params.tenantId,
    worker_id:   params.workerId,
    session_key: params.sessionKey,
    role:        params.role,
    content:     params.content,
    tokens:      params.tokens ?? null,
  });
}

// ── RAG: semantic session retrieval ───────────────────────────────────────────

/**
 * Embeds a query and retrieves semantically similar session notes.
 * Falls back to empty array if pgvector extension or embeddings don't exist yet.
 */
export async function retrieveRelevantSessions(
  tenantId: string,
  query:    string,
  topK = 4,
): Promise<{ session_date: string; notes: string; similarity: number }[]> {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const embeddingRes = await openai.embeddings.create({
      model:  'text-embedding-3-small',
      input:  query,
    });

    const embedding = embeddingRes.data[0].embedding;
    const svc       = createServiceClient();

    const { data } = await svc.rpc('match_sessions', {
      query_embedding: embedding,
      tenant_uuid:     tenantId,
      match_count:     topK,
      min_similarity:  0.70,
    });

    return (data ?? []) as { session_date: string; notes: string; similarity: number }[];
  } catch {
    // pgvector not yet active or no embeddings seeded — degrade gracefully
    return [];
  }
}

/**
 * Generates and stores an embedding for a session's notes.
 * Called by the sessions write path after a session is saved.
 */
export async function embedSessionNote(params: {
  sessionId: string;
  tenantId:  string;
  text:      string;
}): Promise<void> {
  if (!params.text?.trim()) return;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res    = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: params.text,
    });

    const embedding    = res.data[0].embedding;
    const contentHash  = Buffer.from(params.text).toString('base64').slice(0, 64);
    const svc          = createServiceClient();

    await svc.from('session_embeddings').upsert({
      session_id:   params.sessionId,
      tenant_id:    params.tenantId,
      embedding,
      content_hash: contentHash,
    }, { onConflict: 'session_id' });
  } catch {
    // Never let embedding failure block session saves
  }
}
