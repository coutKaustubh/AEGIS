import { USE_MOCK } from './api';
import { mockDocuments } from '@/data/mock-data';
import type { Document, UploadResult } from '@/types/document';

export const documentService = {
  async list(): Promise<Document[]> {
    if (USE_MOCK) return mockDocuments;
    const { apiClient } = await import('./api');
    return apiClient.get('/documents');
  },

  async get(id: string): Promise<Document | undefined> {
    if (USE_MOCK) return mockDocuments.find(d => d.id === id);
    const { apiClient } = await import('./api');
    return apiClient.get(`/documents/${id}`);
  },

  async upload(_file: File): Promise<UploadResult> {
    if (USE_MOCK) {
      return { id: `doc-${Date.now()}`, name: _file.name, status: 'processing', hash: '0x' + '0'.repeat(64) };
    }
    const { apiClient } = await import('./api');
    return apiClient.post('/documents/upload', { name: _file.name });
  },
};
