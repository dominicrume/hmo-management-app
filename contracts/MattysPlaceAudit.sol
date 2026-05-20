// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MattysPlaceAudit
 * @notice Immutable audit registry for Matty's Place HMO Management System.
 *         Stores SHA-256 record hashes and Merkle batch roots on Polygon.
 *
 * Architecture:
 *   - Individual stamps: one tx per audit event (use for high-priority records)
 *   - Merkle anchoring:  one tx per batch (use for routine hourly/daily anchoring)
 *
 * Both mechanisms produce an immutable, tamper-evident trail that can be
 * verified independently of the application database.
 */
contract MattysPlaceAudit {

    // ── Data structures ───────────────────────────────────────────────────────

    struct Stamp {
        address stamper;
        uint256 timestamp;
        string  metadata;   // e.g. "audit:uuid" or "tenant:uuid"
    }

    struct MerkleAnchor {
        address  anchorer;
        uint256  timestamp;
        uint256  recordCount;
        string   description;
    }

    // ── Storage ───────────────────────────────────────────────────────────────

    // payloadHash (hex string) → on-chain stamp
    mapping(bytes32 => Stamp)         private _stamps;

    // Merkle root → anchor record
    mapping(bytes32 => MerkleAnchor)  private _anchors;

    // Authorised stampers (owner-managed allow-list)
    mapping(address => bool)          public  authorised;
    address public                    owner;

    // ── Events ────────────────────────────────────────────────────────────────

    event RecordStamped(
        bytes32 indexed hashedPayload,
        string          payloadHash,   // original hex string for easy off-chain lookup
        address indexed stamper,
        uint256         timestamp,
        string          metadata
    );

    event MerkleRootAnchored(
        bytes32 indexed merkleRoot,
        address indexed anchorer,
        uint256         recordCount,
        uint256         timestamp,
        string          description
    );

    event StamperAuthorised(address indexed stamper);
    event StamperRevoked(address indexed stamper);

    // ── Access control ────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorised() {
        require(authorised[msg.sender] || msg.sender == owner, "Not authorised");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorised[msg.sender] = true;
    }

    function authoriseStamper(address stamper) external onlyOwner {
        authorised[stamper] = true;
        emit StamperAuthorised(stamper);
    }

    function revokeStamper(address stamper) external onlyOwner {
        authorised[stamper] = false;
        emit StamperRevoked(stamper);
    }

    // ── Individual record stamping ─────────────────────────────────────────────

    /**
     * @notice Stamps a single audit record hash on-chain.
     * @param payloadHash  The SHA-256 hex string from audit_logs.payload_hash
     * @param metadata     Free-form context string (e.g. "audit:<uuid>")
     */
    function stampRecord(
        string calldata payloadHash,
        string calldata metadata
    ) external onlyAuthorised {
        bytes32 key = keccak256(bytes(payloadHash));
        require(_stamps[key].timestamp == 0, "Already stamped");

        _stamps[key] = Stamp({
            stamper:   msg.sender,
            timestamp: block.timestamp,
            metadata:  metadata
        });

        emit RecordStamped(key, payloadHash, msg.sender, block.timestamp, metadata);
    }

    /**
     * @notice Verifies whether a payload hash has been stamped on-chain.
     */
    function verifyRecord(string calldata payloadHash)
        external view
        returns (bool exists, uint256 timestamp, address stamper, string memory metadata)
    {
        Stamp memory s = _stamps[keccak256(bytes(payloadHash))];
        return (s.timestamp != 0, s.timestamp, s.stamper, s.metadata);
    }

    // ── Merkle batch anchoring ─────────────────────────────────────────────────

    /**
     * @notice Anchors a Merkle root representing a batch of audit records.
     *         Cheaper than stamping each record individually.
     * @param merkleRoot   Root of the Merkle tree of payload hashes
     * @param recordCount  Number of records included in this batch
     * @param description  Human-readable description (e.g. "hourly batch 2026-05-20T04:00Z")
     */
    function anchorMerkleRoot(
        bytes32 calldata merkleRoot,
        uint256 recordCount,
        string calldata description
    ) external onlyAuthorised {
        require(_anchors[merkleRoot].timestamp == 0, "Already anchored");

        _anchors[merkleRoot] = MerkleAnchor({
            anchorer:    msg.sender,
            timestamp:   block.timestamp,
            recordCount: recordCount,
            description: description
        });

        emit MerkleRootAnchored(merkleRoot, msg.sender, recordCount, block.timestamp, description);
    }

    /**
     * @notice Verifies whether a Merkle root has been anchored on-chain.
     */
    function verifyMerkleRoot(bytes32 merkleRoot)
        external view
        returns (bool exists, uint256 timestamp, address anchorer, uint256 recordCount)
    {
        MerkleAnchor memory a = _anchors[merkleRoot];
        return (a.timestamp != 0, a.timestamp, a.anchorer, a.recordCount);
    }
}
