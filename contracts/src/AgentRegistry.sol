// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice Minimal on-chain directory of LeapVault agents. The off-chain
 *         marketplace is the source of truth for UI, but every agent that
 *         ships in production is mirrored here so judges and integrators
 *         can verify existence + ownership independently of our backend.
 *
 *         Designed for low-cost writes on Mantle Sepolia (and Mantle
 *         mainnet later). No proxy, no upgrades, single deployer.
 */
contract AgentRegistry {
    struct Agent {
        address ownerAddress;
        string metadataURI;
        uint256 registeredAt;
        bool active;
    }

    address public immutable deployer;

    mapping(bytes32 => Agent) private agents;
    bytes32[] private slugs;
    mapping(bytes32 => bool) private known;

    event AgentRegistered(bytes32 indexed slugHash, address indexed ownerAddress, string metadataURI);
    event AgentMetadataUpdated(bytes32 indexed slugHash, string metadataURI);
    event AgentDeactivated(bytes32 indexed slugHash);

    error NotDeployer();
    error AlreadyRegistered();
    error UnknownAgent();
    error NotAgentOwner();

    modifier onlyDeployer() {
        if (msg.sender != deployer) revert NotDeployer();
        _;
    }

    constructor() {
        deployer = msg.sender;
    }

    /// @notice Register a new agent. Only the registry deployer may call.
    /// @param slugHash keccak256 of the agent slug (e.g. "smart-wallet-tracker")
    /// @param ownerAddress wallet that controls future metadata updates
    /// @param metadataURI off-chain JSON or HTTPS URL with full agent profile
    function registerAgent(
        bytes32 slugHash,
        address ownerAddress,
        string calldata metadataURI
    ) external onlyDeployer {
        if (known[slugHash]) revert AlreadyRegistered();
        agents[slugHash] = Agent({
            ownerAddress: ownerAddress,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            active: true
        });
        slugs.push(slugHash);
        known[slugHash] = true;
        emit AgentRegistered(slugHash, ownerAddress, metadataURI);
    }

    /// @notice Update an agent's metadata URI. Only the agent owner.
    function updateMetadata(bytes32 slugHash, string calldata metadataURI) external {
        if (!known[slugHash]) revert UnknownAgent();
        if (agents[slugHash].ownerAddress != msg.sender) revert NotAgentOwner();
        agents[slugHash].metadataURI = metadataURI;
        emit AgentMetadataUpdated(slugHash, metadataURI);
    }

    /// @notice Soft-deactivate an agent. Owner only. Record stays for audit.
    function deactivate(bytes32 slugHash) external {
        if (!known[slugHash]) revert UnknownAgent();
        if (agents[slugHash].ownerAddress != msg.sender) revert NotAgentOwner();
        agents[slugHash].active = false;
        emit AgentDeactivated(slugHash);
    }

    function getAgent(bytes32 slugHash) external view returns (Agent memory) {
        if (!known[slugHash]) revert UnknownAgent();
        return agents[slugHash];
    }

    function isRegistered(bytes32 slugHash) external view returns (bool) {
        return known[slugHash];
    }

    function agentCount() external view returns (uint256) {
        return slugs.length;
    }

    function slugAt(uint256 i) external view returns (bytes32) {
        return slugs[i];
    }
}
