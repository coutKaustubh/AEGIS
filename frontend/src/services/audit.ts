import { USE_MOCK } from './api';
import { mockAuditRecords, mockVerificationSuccess, mockVerificationFailure } from '@/data/mock-data';
import type { AuditRecord, VerificationResult, AuditAction } from '@/types/audit';

export const auditService = {
  async list(filters?: { action?: AuditAction; actor?: string }): Promise<AuditRecord[]> {
    if (USE_MOCK) {
      let records = mockAuditRecords;
      if (filters?.action) records = records.filter(r => r.action === filters.action);
      if (filters?.actor) records = records.filter(r => r.actor.toLowerCase().includes(filters.actor!.toLowerCase()));
      return records;
    }
    const { apiClient } = await import('./api');
    return apiClient.get('/chats/audit/');
  },

  async get(id: string): Promise<AuditRecord | undefined> {
    if (USE_MOCK) return mockAuditRecords.find(r => r.id === id);
    const { apiClient } = await import('./api');
    const records = await apiClient.get<AuditRecord[]>('/chats/audit/');
    return records.find((record) => record.id === id);
  },

  async verify(artifactId: string): Promise<VerificationResult> {
    if (USE_MOCK) {
      // Simulate: art-001 passes, anything else fails
      if (artifactId === 'art-001' || artifactId === 'doc-001') return mockVerificationSuccess;
      return mockVerificationFailure;
    }
    const { apiClient } = await import('./api');
    const result = await apiClient.get<any>('/chats/audit/verify/');
    return {
      artifactId,
      artifactName: artifactId,
      localHash: '',
      recordedHash: '',
      match: Boolean(result.valid),
      blockchainNetwork: result.chain || 'AEGIS runtime audit chain',
      timestamp: new Date().toISOString(),
      action: result.recorded ? 'RUNTIME_CHAIN_VERIFIED' : 'RUNTIME_CHAIN_UNRECORDED',
    };
  },
};
