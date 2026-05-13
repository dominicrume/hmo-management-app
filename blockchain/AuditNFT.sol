// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuditNFT is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    // Mapping to store the SHA-256 hash for each token
    mapping(uint256 => string) public auditHashes;

    event AuditStamped(uint256 indexed tokenId, string documentHash, address indexed stamper);

    constructor(address initialOwner) ERC721("MattyAudit", "MTA") Ownable(initialOwner) {}

    function stampAudit(address to, string memory uri, string memory documentHash) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _mint(to, tokenId);
        _setTokenURI(tokenId, uri);
        auditHashes[tokenId] = documentHash;
        emit AuditStamped(tokenId, documentHash, to);
        return tokenId;
    }
}
