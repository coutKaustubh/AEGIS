export const auditLedgerAbi = [
  {
    type: 'function',
    name: 'AUDITOR_ROLE',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'recordArtifact',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'artifactHash', type: 'bytes32' },
      { name: 'previousHash', type: 'bytes32' },
      { name: 'action', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'getRecord',
    stateMutability: 'view',
    inputs: [{ name: 'recordId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'artifactHash', type: 'bytes32' },
          { name: 'previousHash', type: 'bytes32' },
          { name: 'action', type: 'string' },
          { name: 'actor', type: 'address' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'exists', type: 'bool' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'verifyArtifact',
    stateMutability: 'view',
    inputs: [
      { name: 'recordId', type: 'bytes32' },
      { name: 'artifactHash', type: 'bytes32' },
    ],
    outputs: [{ name: 'matched', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'ArtifactRecorded',
    anonymous: false,
    inputs: [
      { indexed: true, name: 'recordId', type: 'bytes32' },
      { indexed: true, name: 'artifactHash', type: 'bytes32' },
      { indexed: true, name: 'previousHash', type: 'bytes32' },
      { indexed: false, name: 'action', type: 'string' },
      { indexed: false, name: 'actor', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
] as const;
