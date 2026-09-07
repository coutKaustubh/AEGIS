export interface KnowledgeSearchResult {
  id: string;
  documentId: string;
  documentName: string;
  department: string;
  relevantPages: number[];
  relevanceScore: number;
  lastUpdated: string;
  snippet: string;
}

export interface KnowledgeQuery {
  query: string;
  department?: string;
  documentType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface KnowledgeAnswer {
  answer: string;
  sources: KnowledgeSource[];
  model: string;
  processedLocally: boolean;
}

export interface KnowledgeSource {
  documentName: string;
  page: number;
  snippet: string;
  relevance: number;
}
