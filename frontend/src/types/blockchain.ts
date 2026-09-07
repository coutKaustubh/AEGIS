export interface BlockchainConfig {
  contractAddress?: `0x${string}`;
  abi?: unknown[];
  rpcUrl?: string;
  chainId?: number;
  networkName?: string;
}

export interface ArtifactRecord {
  artifactId: string;
  contentHash: `0x${string}`;
  timestamp: number;
  actor: string;
  eventType: string;
  metadata: string;
}

export interface BlockchainTransaction {
  transactionHash?: string;
  blockNumber?: number;
  timestamp: string;
  status: 'confirmed' | 'pending' | 'failed';
}
