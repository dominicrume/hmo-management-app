import { NextRequest }                    from 'next/server';
import { withApi }                        from '@/lib/api/middleware';
import { apiOk, apiBadRequest, apiNotFound } from '@/lib/api/response';
import { validate, firstError }           from '@/lib/api/validate';
import { stampRecordOnChain }             from '@/lib/blockchain/stamp';
import { buildMerkleTree, generateProof } from '@/lib/blockchain/merkle';
import { anchorMerkleRootOnChain }        from '@/lib/blockchain/stamp';
import { createServiceClient }            from '@/lib/supabase/server';
import { log }                            from '@/lib/observability/logger';
import type { AuthContext }               from '@/lib/security/rbac';

// POST /api/blockchain/stamp — stamp one or a batch of audit logs on Polygon
export const POST = withApi({ permission: 'audit:read', rateLimit: 'api' }, async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json();
  const err  = firstError(validate(body, {
    // Single stamp: pass audit_log_id
    audit_log_id: { type: 'uuid' },
    // Batch stamp: pass hours_back (0-24) to anchor all unstamped from last N hours
    batch_hours:  { type: 'number' },
  }));
  if (err) return apiBadRequest(err);

  const svc = createServiceClient();

  // ── Single record stamp ────────────────────────────────────────────────────
  if (body.audit_log_id) {
    const { data: log_record } = await svc
      .from('audit_logs')
      .select('id, payload_hash, blockchain_tx_id, actor_name, action')
      .eq('id', body.audit_log_id)
      .single();

    if (!log_record) return apiNotFound('Audit log');
    if (log_record.blockchain_tx_id) {
      return apiOk({ already_stamped: true, tx: log_record.blockchain_tx_id });
    }

    const metadata = `audit:${log_record.id}`;
    const result   = await stampRecordOnChain(log_record.payload_hash, metadata);

    if (result.success && result.transactionHash) {
      // Update audit_log with blockchain tx id
      await svc
        .from('audit_logs')
        .update({ blockchain_tx_id: result.transactionHash })
        .eq('id', body.audit_log_id);

      // Mirror to blockchain_stamps cache
      await svc.from('blockchain_stamps').insert({
        payload_hash:  log_record.payload_hash,
        audit_log_id:  log_record.id,
        tx_hash:       result.transactionHash,
        block_number:  result.blockNumber ?? null,
        stamp_type:    'individual',
        metadata,
      });
    }

    return apiOk({ ...result, payload_hash: log_record.payload_hash });
  }

  // ── Merkle batch anchor ────────────────────────────────────────────────────
  const hoursBack = Math.min(Number(body.batch_hours ?? 1), 24);
  const since     = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

  const { data: unstamped } = await svc
    .from('audit_logs')
    .select('id, payload_hash')
    .gte('stamped_at', since)
    .is('blockchain_tx_id', null)
    .limit(500);

  if (!unstamped?.length) {
    return apiOk({ batched: 0, message: 'No unstamped records in window' });
  }

  const hashes = unstamped.map((r) => r.payload_hash);
  const tree   = buildMerkleTree(hashes);
  const desc   = `batch:${hoursBack}h:${new Date().toISOString().split('T')[0]}:count=${hashes.length}`;

  const result = await anchorMerkleRootOnChain(tree.root, hashes.length, desc);

  if (result.success && result.transactionHash) {
    await svc.from('merkle_batches').insert({
      merkle_root:  tree.root,
      tx_hash:      result.transactionHash,
      block_number: result.blockNumber ?? null,
      record_count: hashes.length,
      description:  desc,
      hashes:       hashes,
      anchored_at:  new Date().toISOString(),
    });

    // Mark each audit_log with the merkle batch tx
    for (const record of unstamped) {
      const { proof } = generateProof(record.payload_hash, tree);
      await svc
        .from('audit_logs')
        .update({ blockchain_tx_id: result.transactionHash })
        .eq('id', record.id);

      await svc.from('blockchain_stamps').insert({
        payload_hash: record.payload_hash,
        audit_log_id: record.id,
        tx_hash:      result.transactionHash,
        block_number: result.blockNumber ?? null,
        stamp_type:   'merkle_batch',
        merkle_root:  tree.root,
        metadata:     JSON.stringify(proof),
      });
    }

    void log.info(`Merkle batch anchored: ${hashes.length} records`, {
      route:   '/api/blockchain/stamp',
      actorId: ctx.dbUser.id,
      meta:    { merkle_root: tree.root, tx: result.transactionHash },
    });
  }

  return apiOk({
    ...result,
    batched:     hashes.length,
    merkle_root: tree.root,
  });
});
