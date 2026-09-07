export type AuditAction =
  | 'DOCUMENT_UPLOADED'
  | 'AI_ANALYSIS'
  | 'DOCUMENT_GENERATED'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'ARTIFACT_VERIFIED'
  | 'KNOWLEDGE_INDEXED'
  | 'AGENT_EXECUTED'
  | 'MODEL_INVOKED'
  | 'CODE_EXECUTED';

export type BlockchainStatus = 'confirmed' | 'pending' | 'failed' | 'not_recorded';

export interface AuditRecord {
  id: string;
  artifactId: string;
  artifactName: string;
  action: AuditAction;
  actor: string;
  model?: string;
  timestamp: string;
  hash: string;
  blockchainStatus: BlockchainStatus;
  transactionHash?: string;
  blockNumber?: number;
}

export interface AuditDetail extends AuditRecord {
  description: string;
  metadata: Record<string, string>;
  relatedArtifacts?: string[];
}

export interface VerificationResult {
  artifactId: string;
  artifactName: string;
  localHash: string;
  recordedHash: string;
  match: boolean;
  blockchainNetwork?: string;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: string;
  action?: string;
}
