import { USE_MOCK } from './api';
import { mockKnowledgeResults } from '@/data/mock-data';
import type { KnowledgeSearchResult, KnowledgeQuery, KnowledgeAnswer } from '@/types/knowledge';

export const knowledgeService = {
  async search(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]> {
    if (USE_MOCK) {
      const q = query.query.toLowerCase();
      return mockKnowledgeResults.filter(r =>
        r.documentName.toLowerCase().includes(q) ||
        r.snippet.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        q.length < 3
      );
    }
    const { apiClient } = await import('./api');
    const rows = await apiClient.post<any[]>('/chats/knowledge/search/', { query: query.query, top_k: 10 });
    return rows.map((row) => ({
      id: row.metadata?.chunk_id || row.id,
      documentId: row.metadata?.document_id || row.source,
      documentName: row.source || 'Indexed document',
      department: row.metadata?.department || 'Knowledge base',
      relevantPages: row.metadata?.page ? [Number(row.metadata.page)] : [],
      relevanceScore: Number(row.score || 0),
      lastUpdated: row.metadata?.last_updated || new Date().toISOString(),
      snippet: row.content || row.snippet || '',
    }));
  },

  async ask(query: string): Promise<KnowledgeAnswer> {
    if (USE_MOCK) {
      return {
        answer: `Based on the internal knowledge base, here is the relevant information regarding "${query}":\n\nThe organizational procedures specify that all operations must comply with OISD standards. Detailed protocols can be found in the Safety Manual, Section 4.`,
        sources: [
          { documentName: 'Safety Manual — H2S Emergency Response', page: 37, snippet: 'In case of H2S detection above 10 ppm...', relevance: 0.96 },
          { documentName: 'SOP — Crude Distillation Unit Startup', page: 14, snippet: 'Pre-startup safety review checklist...', relevance: 0.89 },
        ],
        model: 'Mistral-7B',
        processedLocally: true,
      };
    }
    const { apiClient } = await import('./api');
    return apiClient.post('/chats/knowledge/ask/', { query });
  },
};
