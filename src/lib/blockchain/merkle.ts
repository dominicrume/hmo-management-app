// Merkle tree for batch anchoring — one on-chain tx per batch instead of per record.
//
// Why Merkle?
//   Stamping every audit_log individually costs gas for every DB write.
//   Instead: accumulate hashes hourly → build tree → anchor ONE root on-chain.
//   Any individual hash can be proven to be in the batch with O(log n) proof.

import { ethers } from 'ethers';

export interface MerkleTree {
  root:   string;             // 0x-prefixed hex
  leaves: string[];           // sorted keccak256(payloadHash) values
  layers: string[][];         // all levels of the tree
}

export interface MerkleProof {
  leaf:  string;
  proof: string[];
  root:  string;
  valid: boolean;
}

function keccak(value: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(value));
}

function hashPair(a: string, b: string): string {
  // Sort before hashing so proof generation order doesn't matter
  const [left, right] = a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
  return ethers.keccak256(ethers.concat([left, right]));
}

/**
 * Builds a Merkle tree from an array of payload hashes.
 * Handles odd-length arrays by duplicating the last leaf.
 */
export function buildMerkleTree(payloadHashes: string[]): MerkleTree {
  if (payloadHashes.length === 0) {
    const empty = ethers.ZeroHash;
    return { root: empty, leaves: [], layers: [[empty]] };
  }

  // Leaf nodes: keccak256 of each payload hash string
  const leaves = payloadHashes.map(keccak).sort();
  const layers: string[][] = [leaves];

  let current = leaves;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      const left  = current[i];
      const right = current[i + 1] ?? current[i]; // duplicate last if odd
      next.push(hashPair(left, right));
    }
    layers.push(next);
    current = next;
  }

  return { root: current[0], leaves, layers };
}

/**
 * Generates a Merkle proof for a specific payload hash.
 * The proof is an array of sibling hashes needed to reconstruct the root.
 */
export function generateProof(payloadHash: string, tree: MerkleTree): MerkleProof {
  const leaf  = keccak(payloadHash);
  let   index = tree.leaves.indexOf(leaf);

  if (index === -1) {
    return { leaf, proof: [], root: tree.root, valid: false };
  }

  const proof: string[] = [];
  for (let layer = 0; layer < tree.layers.length - 1; layer++) {
    const isRight  = index % 2 === 1;
    const sibling  = isRight ? tree.layers[layer][index - 1] : tree.layers[layer][index + 1];
    if (sibling) proof.push(sibling);
    index = Math.floor(index / 2);
  }

  return { leaf, proof, root: tree.root, valid: true };
}

/**
 * Verifies a Merkle proof against a known root.
 * Can be used client-side to verify inclusion without trusting the server.
 */
export function verifyProof(payloadHash: string, proof: string[], root: string): boolean {
  let computed = keccak(payloadHash);
  for (const sibling of proof) {
    computed = hashPair(computed, sibling);
  }
  return computed.toLowerCase() === root.toLowerCase();
}
