import { USE_MOCK } from './api';
import { mockDocuments } from '@/data/mock-data';
import type { Document, UploadResult } from '@/types/document';

export const documentService = {
  async list(): Promise<Document[]> {
    if (USE_MOCK) return mockDocuments;
    const { apiClient } = await import('./api');
    const items = await apiClient.get<Array<Record<string, unknown>>>('/chats/documents/');
    return items.map(normalizeDocument);
  },

  async get(id: string): Promise<Document | undefined> {
    if (USE_MOCK) return mockDocuments.find(d => d.id === id);
    const { apiClient } = await import('./api');
    const items = await apiClient.get<Array<Record<string, unknown>>>('/chats/documents/');
    const found = items.find((item) => String(item.id) === id);
    return found ? normalizeDocument(found) : undefined;
  },

  async upload(_file: File): Promise<UploadResult> {
    if (USE_MOCK) {
      return { id: `doc-${Date.now()}`, name: _file.name, status: 'processing', hash: '0x' + '0'.repeat(64) };
    }
    const { apiClient } = await import('./api');
    const form = new FormData();
    form.append('files', _file, _file.name);
    const response = await apiClient.postForm<{ files: Array<{ id: string; name: string }> }>('/chats/documents/upload/', form);
    return { id: response.files[0]?.id || '', name: _file.name, status: 'uploaded', hash: '' };
  },
};

function normalizeDocument(raw: Record<string, unknown>): Document {
  const name = String(raw.name || 'document');
  const extension = name.split('.').pop()?.toLowerCase() || 'text';
  const type = ['pdf', 'docx', 'xlsx', 'pptx', 'image'].includes(extension) ? extension : 'text';
  return {
    id: String(raw.id), name, type: type as Document['type'], department: '', classification: 'INTERNAL',
    status: raw.status === 'failed' ? 'failed' : ['indexed', 'verified', 'generated'].includes(String(raw.status)) ? 'indexed' : raw.status === 'uploaded' ? 'uploaded' : 'processing',
    size: Number(raw.size || 0), uploadedAt: String(raw.created_at || new Date().toISOString()), uploadedBy: '',
    hash: typeof raw.hash === 'string' ? raw.hash : undefined,
    downloadUrl: typeof raw.download_url === 'string' ? raw.download_url : undefined,
  };
}
