// Blockchain verification — checks payload hashes and Merkle proofs against Polygon.

import { ethers }                      from 'ethers';
import { AUDIT_ABI, CONTRACT_ADDRESS, RPC_URL } from './abi';
import { buildMerkleTree }             from './merkle';

export interface ChainVerification {
  onChain:      boolean;
  timestamp?:   number;       // Unix seconds
  stamper?:     string;       // wallet address
  metadata?:    string;
  txExplorer?:  string;       // Polygonscan URL
  error?:       string;
}

export interface MerkleVerification {
  inBatch:      boolean;      // hash is in a batch whose root is on-chain
  merkleRoot?:  string;
  timestamp?:   number;
  recordCount?: number;
}

function getReadContract() {
  if (!CONTRACT_ADDRESS) return null;
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(CONTRACT_ADDRESS, AUDIT_ABI, provider);
}

/**
 * Verifies an individual payload hash against the on-chain registry.
 */
export async function verifyPayloadHash(payloadHash: string): Promise<ChainVerification> {
  const contract = getReadContract();
  if (!contract) return { onChain: false, error: 'Contract not configured' };

  try {
    const [exists, timestamp, stamper, metadata] =
      await contract.verifyRecord(payloadHash);

    if (!exists) return { onChain: false };

    return {
      onChain:     true,
      timestamp:   Number(timestamp),
      stamper,
      metadata,
      txExplorer: `https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`,
    };
  } catch (e) {
    return { onChain: false, error: e instanceof Error ? e.message : 'Verify failed' };
  }
}

/**
 * Verifies a Merkle root on-chain.
 */
export async function verifyMerkleRoot(merkleRoot: string): Promise<ChainVerification> {
  const contract = getReadContract();
  if (!contract) return { onChain: false, error: 'Contract not configured' };

  try {
    const [exists, timestamp, anchorer, recordCount] =
      await contract.verifyMerkleRoot(merkleRoot);

    if (!exists) return { onChain: false };

    return {
      onChain:    true,
      timestamp:  Number(timestamp),
      stamper:    anchorer,
      metadata:   `Batch of ${Number(recordCount)} records`,
      txExplorer: `https://amoy.polygonscan.com/address/${CONTRACT_ADDRESS}`,
    };
  } catch (e) {
    return { onChain: false, error: e instanceof Error ? e.message : 'Verify failed' };
  }
}

/**
 * Checks if a payload hash is provably included in an on-chain Merkle batch.
 * Pass all the payload hashes from the same batch for the proof to work.
 */
export async function verifyMerkleInclusion(
  payloadHash: string,
  batchHashes: string[],
): Promise<MerkleVerification> {
  const { root } = buildMerkleTree(batchHashes);
  const chainResult = await verifyMerkleRoot(root);

  return {
    inBatch:     chainResult.onChain,
    merkleRoot:  root,
    timestamp:   chainResult.timestamp,
    recordCount: batchHashes.length,
  };
}
