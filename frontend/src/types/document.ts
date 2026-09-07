export type Classification = 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'dwg' | 'image' | 'text';
  department: string;
  classification: Classification;
  status: DocumentStatus;
  size: number;
  pages?: number;
  uploadedAt: string;
  uploadedBy: string;
  hash?: string;
  ocrStatus?: 'pending' | 'completed' | 'failed' | 'not_required';
  ragStatus?: 'pending' | 'indexed' | 'failed' | 'not_indexed';
  aiAnalysis?: DocumentAnalysis;
  extractedText?: string;
  auditTrail?: DocumentAuditEntry[];
}

export interface DocumentAnalysis {
  summary: string;
  keyFindings: string[];
  topics: string[];
  generatedAt: string;
  model: string;
}

export interface DocumentAuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  detail?: string;
}

export interface UploadResult {
  id: string;
  name: string;
  status: DocumentStatus;
  hash: string;
}
