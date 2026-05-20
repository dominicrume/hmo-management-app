// Server-side blockchain stamping — uses private key wallet, not MetaMask.
// Called from API routes only (never from client components).

import { ethers }             from 'ethers';
import { AUDIT_ABI, RPC_URL } from './abi';

export interface StampResult {
  success:         boolean;
  transactionHash?: string;
  blockNumber?:    number;
  error?:          string;
}

function getServerContract() {
  const privateKey       = process.env.POLYGON_WALLET_PRIVATE_KEY;
  const contractAddress  = process.env.POLYGON_CONTRACT_ADDRESS;

  if (!privateKey || !contractAddress) {
    return null;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet   = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, AUDIT_ABI, wallet);
}

/**
 * Stamps a single payload hash on-chain.
 * Used for high-priority records (tenant intake, form signatures).
 * Returns success:true with tx hash, or success:false with error message.
 */
export async function stampRecordOnChain(
  payloadHash: string,
  metadata:    string,
): Promise<StampResult> {
  const contract = getServerContract();
  if (!contract) {
    return { success: false, error: 'Blockchain not configured — set POLYGON_CONTRACT_ADDRESS and POLYGON_WALLET_PRIVATE_KEY' };
  }

  try {
    const tx      = await contract.stampRecord(payloadHash, metadata);
    const receipt = await tx.wait();
    return {
      success:         true,
      transactionHash: receipt.hash,
      blockNumber:     receipt.blockNumber,
    };
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown blockchain error';
    // "Already stamped" is a revert — not an application error
    if (message.includes('Already stamped')) {
      return { success: true, error: 'Already on-chain' };
    }
    return { success: false, error: message };
  }
}

/**
 * Anchors a Merkle root on-chain (batch stamping).
 * Called by the hourly batch anchor job.
 */
export async function anchorMerkleRootOnChain(
  merkleRoot:   string,   // 0x-prefixed 32-byte hex
  recordCount:  number,
  description:  string,
): Promise<StampResult> {
  const contract = getServerContract();
  if (!contract) {
    return { success: false, error: 'Blockchain not configured' };
  }

  try {
    const tx      = await contract.anchorMerkleRoot(merkleRoot, recordCount, description);
    const receipt = await tx.wait();
    return {
      success:         true,
      transactionHash: receipt.hash,
      blockNumber:     receipt.blockNumber,
    };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Merkle anchor failed' };
  }
}
