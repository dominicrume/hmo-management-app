import { NextRequest }                        from 'next/server';
import { withApi }                            from '@/lib/api/middleware';
import { apiOk, apiBadRequest }               from '@/lib/api/response';
import { validate, firstError }               from '@/lib/api/validate';
import { verifyPayloadHash, verifyMerkleInclusion } from '@/lib/blockchain/verify';
import { createServiceClient }                from '@/lib/supabase/server';

// POST /api/blockchain/verify — verify an audit log hash against Polygon
// Supports both individual stamp verification and Merkle batch inclusion proof.
export const POST = withApi({ permission: 'audit:read', rateLimit: 'api' }, async (req: NextRequest) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    payload_hash: { type: 'string', required: true, minLength: 10 },
    // Optional: pass batch hashes to prove Merkle inclusion
    batch_hashes: { type: 'string' }, // JSON-encoded array
  }));
  if (err) return apiBadRequest(err);

  const { payload_hash, batch_hashes } = body as { payload_hash: string; batch_hashes?: string };

  // Look up the audit log record from DB first
  const svc = createServiceClient();
  const { data: auditLog } = await svc
    .from('audit_logs')
    .select('id, actor_name, action, stamped_at, payload_hash, blockchain_tx_id')
    .eq('payload_hash', payload_hash)
    .single();

  // Check on-chain — individual stamp
  const chainResult = await verifyPayloadHash(payload_hash);

  // If batch hashes provided, also verify Merkle inclusion
  let merkleResult = null;
  if (batch_hashes) {
    try {
      const hashes = JSON.parse(batch_hashes) as string[];
      merkleResult = await verifyMerkleInclusion(payload_hash, hashes);
    } catch {
      // Invalid JSON — ignore Merkle check
    }
  }

  return apiOk({
    payload_hash,
    db_record:      auditLog ?? null,
    on_chain:       chainResult,
    merkle_proof:   merkleResult,
    // Trust level: higher = more trust
    trust_level:
      chainResult.onChain          ? 'blockchain_verified'
      : merkleResult?.inBatch      ? 'merkle_verified'
      : auditLog                   ? 'db_only'
      : 'not_found',
  });
});
