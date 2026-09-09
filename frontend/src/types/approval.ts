export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision' | 'expired';

export interface Approval {
  id: string;
  documentId: string;
  documentName: string;
  requestType: string;
  requestDetail: string;
  generatedBy: string;
  model: string;
  reviewer?: string;
  status: ApprovalStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerComment?: string;
  aiSummary?: string;
  keyFindings?: string[];
  sources?: ApprovalSource[];
  artifactHash?: string;
}

export interface ApprovalSource {
  documentName: string;
  page: number;
  relevance: number;
  snippet: string;
}
