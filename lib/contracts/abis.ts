/**
 * Reference ABI fragments for the LeapVault Agent contract suite on Mantle.
 *
 * These are forward-compatible shapes the frontend expects. The actual Solidity
 * implementation can iterate independently as long as the externally visible
 * function signatures stay in sync.
 */

export const AGENT_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "registerAgent",
    inputs: [
      { name: "slug", type: "string" },
      { name: "metadataUri", type: "string" },
    ],
    outputs: [{ name: "agentId", type: "bytes32" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getAgent",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "slug", type: "string" },
          { name: "metadataUri", type: "string" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getAgents",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "agentIds", type: "bytes32[]" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "updateAgentStatus",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "status", type: "uint8" },
    ],
    outputs: [],
  },
] as const;

export const TASK_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "createTask",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "taskHash", type: "bytes32" },
      { name: "metadataUri", type: "string" },
    ],
    outputs: [{ name: "taskId", type: "bytes32" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "completeTask",
    inputs: [
      { name: "taskId", type: "bytes32" },
      { name: "resultHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getTask",
    inputs: [{ name: "taskId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "user", type: "address" },
          { name: "agentId", type: "bytes32" },
          { name: "taskHash", type: "bytes32" },
          { name: "resultHash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "createdAt", type: "uint64" },
          { name: "completedAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getUserTasks",
    inputs: [
      { name: "user", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "taskIds", type: "bytes32[]" }],
  },
] as const;

export const REPUTATION_REGISTRY_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "updateReputation",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "score", type: "uint16" },
      { name: "period", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getReputation",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "score", type: "uint16" },
          { name: "period", type: "uint64" },
          { name: "proofHash", type: "bytes32" },
          { name: "updatedAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "storeProofHash",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "proofHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;
