// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ReputationRegistry
 * @notice Anchors LeapVault agent reputation scores on-chain. The off-chain
 *         service (server-only, see lib/services/reputation-events.ts)
 *         computes the score atomically after every event and calls
 *         recordReputation as a best-effort write. Tx hash + block number
 *         are surfaced in the UI as proof.
 *
 *         The anchor address is a server hot wallet held only on the
 *         deployment host. It is rotatable by the deployer. Compromise of
 *         the anchor key lets an attacker write false reputation, but
 *         cannot drain funds (this contract holds none).
 */
contract ReputationRegistry {
    struct Reputation {
        uint16 score;
        uint32 alertCount;
        uint32 proposalCount;
        uint32 executionCount;
        uint64 timestamp;
        bytes32 evidenceHash;
    }

    address public immutable deployer;
    address public anchor;

    mapping(bytes32 => Reputation) private latest;

    event AnchorRotated(address indexed previous, address indexed current);
    event ReputationRecorded(
        bytes32 indexed slugHash,
        uint16 score,
        uint32 alertCount,
        uint32 proposalCount,
        uint32 executionCount,
        bytes32 evidenceHash,
        uint64 timestamp
    );

    error NotDeployer();
    error NotAnchor();
    error ZeroAddress();
    error ScoreOutOfRange();

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    modifier onlyAnchor() {
        if (msg.sender != anchor) revert NotAnchor();
        _;
    }

    constructor(address initialAnchor) {
        if (initialAnchor == address(0)) revert ZeroAddress();
        deployer = msg.sender;
        anchor = initialAnchor;
        emit AnchorRotated(address(0), initialAnchor);
    }

    /// @notice Rotate the anchor wallet. Deployer only.
    function setAnchor(address newAnchor) external onlyDeployer {
        if (newAnchor == address(0)) revert ZeroAddress();
        emit AnchorRotated(anchor, newAnchor);
        anchor = newAnchor;
    }

    /// @notice Write the latest reputation snapshot for an agent. Anchor only.
    /// @param slugHash keccak256 of the agent slug
    /// @param score 0..100, clamped server-side before submission
    /// @param alertCount cumulative useful alerts (counter)
    /// @param proposalCount cumulative proposals approved (counter)
    /// @param executionCount cumulative executions completed (counter)
    /// @param evidenceHash sha256 of the off-chain reputation breakdown JSON
    function recordReputation(
        bytes32 slugHash,
        uint16 score,
        uint32 alertCount,
        uint32 proposalCount,
        uint32 executionCount,
        bytes32 evidenceHash
    ) external onlyAnchor {
        if (score > 100) revert ScoreOutOfRange();
        uint64 ts = uint64(block.timestamp);
        latest[slugHash] = Reputation({
            score: score,
            alertCount: alertCount,
            proposalCount: proposalCount,
            executionCount: executionCount,
            timestamp: ts,
            evidenceHash: evidenceHash
        });
        emit ReputationRecorded(slugHash, score, alertCount, proposalCount, executionCount, evidenceHash, ts);
    }

    function getReputation(bytes32 slugHash) external view returns (Reputation memory) {
        return latest[slugHash];
    }
}
