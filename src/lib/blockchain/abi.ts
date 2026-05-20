// ABI for MattysPlaceAudit.sol — single source of truth for both client and server.

export const AUDIT_ABI = [
  // Individual record stamping
  'function stampRecord(string calldata payloadHash, string calldata metadata) external',
  'function verifyRecord(string calldata payloadHash) external view returns (bool exists, uint256 timestamp, address stamper, string memory metadata)',

  // Merkle batch anchoring
  'function anchorMerkleRoot(bytes32 merkleRoot, uint256 recordCount, string calldata description) external',
  'function verifyMerkleRoot(bytes32 merkleRoot) external view returns (bool exists, uint256 timestamp, address anchorer, uint256 recordCount)',

  // Access control
  'function authoriseStamper(address stamper) external',
  'function authorised(address) external view returns (bool)',
  'function owner() external view returns (address)',

  // Events
  'event RecordStamped(bytes32 indexed hashedPayload, string payloadHash, address indexed stamper, uint256 timestamp, string metadata)',
  'event MerkleRootAnchored(bytes32 indexed merkleRoot, address indexed anchorer, uint256 recordCount, uint256 timestamp, string description)',
] as const;

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '';
export const RPC_URL = process.env.POLYGON_RPC_URL ?? 'https://rpc-amoy.polygon.technology/';
