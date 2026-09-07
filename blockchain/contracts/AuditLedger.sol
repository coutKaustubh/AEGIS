// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {AccessControl} from '@openzeppelin/contracts/access/AccessControl.sol';

/// @title AEGIS Audit Ledger
/// @notice Stores cryptographic fingerprints and minimal provenance metadata.
/// @dev Confidential artifacts and application credentials must remain off-chain.
contract AuditLedger is AccessControl {
    bytes32 public constant AUDITOR_ROLE = keccak256('AUDITOR_ROLE');

    struct AuditRecord {
        bytes32 artifactHash;
        bytes32 previousHash;
        string action;
        address actor;
        uint256 timestamp;
        bool exists;
    }

    mapping(bytes32 recordId => AuditRecord record) private records;

    error InvalidAdmin();
    error InvalidRecordId();
    error InvalidArtifactHash();
    error EmptyAction();
    error RecordAlreadyExists(bytes32 recordId);
    error RecordNotFound(bytes32 recordId);

    event ArtifactRecorded(
        bytes32 indexed recordId,
        bytes32 indexed artifactHash,
        bytes32 indexed previousHash,
        string action,
        address actor,
        uint256 timestamp
    );

    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert InvalidAdmin();
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(AUDITOR_ROLE, initialAdmin);
    }

    /// @notice Record a new artifact fingerprint and provenance event.
    /// @param recordId Stable application-level record identifier hashed to bytes32.
    /// @param artifactHash SHA-256 or equivalent artifact fingerprint represented as bytes32.
    /// @param previousHash Previous audit-chain hash, or bytes32(0) for the first record.
    /// @param action Minimal event label such as DOCUMENT_GENERATED or APPROVED.
    function recordArtifact(
        bytes32 recordId,
        bytes32 artifactHash,
        bytes32 previousHash,
        string calldata action
    ) external onlyRole(AUDITOR_ROLE) {
        if (recordId == bytes32(0)) revert InvalidRecordId();
        if (artifactHash == bytes32(0)) revert InvalidArtifactHash();
        if (records[recordId].exists) revert RecordAlreadyExists(recordId);
        if (bytes(action).length == 0) revert EmptyAction();

        uint256 recordedAt = block.timestamp;
        records[recordId] = AuditRecord({
            artifactHash: artifactHash,
            previousHash: previousHash,
            action: action,
            actor: msg.sender,
            timestamp: recordedAt,
            exists: true
        });

        emit ArtifactRecorded(recordId, artifactHash, previousHash, action, msg.sender, recordedAt);
    }

    /// @notice Retrieve a previously recorded provenance entry.
    function getRecord(bytes32 recordId) external view returns (AuditRecord memory) {
        if (!records[recordId].exists) revert RecordNotFound(recordId);
        return records[recordId];
    }

    /// @notice Compare a locally calculated artifact fingerprint with the ledger.
    /// @return matched True only when the record exists and hashes are identical.
    function verifyArtifact(bytes32 recordId, bytes32 artifactHash) external view returns (bool matched) {
        return records[recordId].exists && records[recordId].artifactHash == artifactHash;
    }
}
