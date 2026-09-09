import { USE_MOCK } from './api';
import { mockApprovals } from '@/data/mock-data';
import type { Approval, ApprovalStatus } from '@/types/approval';

interface PermissionRecord {
  id: string;
  request_id: string;
  task: string;
  action: string;
  tool: string;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  decision_reason: string;
  created_at: string;
  updated_at: string;
}

function toApproval(item: PermissionRecord): Approval {
  const taskId = String(item.task);
  return {
    id: item.id,
    documentId: taskId,
    documentName: String(item.details?.path || item.details?.command || item.tool || item.action),
    requestType: item.action,
    requestDetail: JSON.stringify(item.details || {}),
    generatedBy: 'AEGIS AI',
    model: 'Local specialist',
    status: item.status === 'expired' ? 'expired' : item.status === 'denied' ? 'rejected' : item.status === 'approved' ? 'approved' : 'pending',
    createdAt: item.created_at,
    reviewedAt: item.status === 'pending' ? undefined : item.updated_at,
    reviewerComment: item.decision_reason || undefined,
  };
}

export const approvalService = {
  async list(status?: ApprovalStatus): Promise<Approval[]> {
    if (USE_MOCK) {
      if (status) return mockApprovals.filter(a => a.status === status);
      return mockApprovals;
    }
    const { apiClient } = await import('./api');
    const query = status ? `?status=${status}` : '';
    const items = await apiClient.get<PermissionRecord[]>(`/chats/permissions/${query}`);
    return items.map(toApproval);
  },

  async get(id: string): Promise<Approval | undefined> {
    if (USE_MOCK) return mockApprovals.find(a => a.id === id);
    const { apiClient } = await import('./api');
    const items = await apiClient.get<PermissionRecord[]>('/chats/permissions/');
    const found = items.find((item) => item.id === id);
    return found ? toApproval(found) : undefined;
  },

  async approve(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'approved', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    const { apiClient } = await import('./api');
    const items = await apiClient.get<PermissionRecord[]>('/chats/permissions/');
    const found = items.find((item) => item.id === id);
    if (!found) throw new Error('Approval request not found.');
    await apiClient.post(`/chats/tasks/${found.task}/permissions/${found.request_id}/approve/`, { reason: comment });
    return toApproval({ ...found, status: 'approved', decision_reason: comment });
  },

  async reject(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'rejected', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    const { apiClient } = await import('./api');
    const items = await apiClient.get<PermissionRecord[]>('/chats/permissions/');
    const found = items.find((item) => item.id === id);
    if (!found) throw new Error('Approval request not found.');
    await apiClient.post(`/chats/tasks/${found.task}/permissions/${found.request_id}/deny/`, { reason: comment });
    return toApproval({ ...found, status: 'denied', decision_reason: comment });
  },

  async requestRevision(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'revision', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    return this.reject(id, comment);
  },
};
