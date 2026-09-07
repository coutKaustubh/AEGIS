import { USE_MOCK } from './api';
import { mockApprovals } from '@/data/mock-data';
import type { Approval, ApprovalStatus } from '@/types/approval';

export const approvalService = {
  async list(status?: ApprovalStatus): Promise<Approval[]> {
    if (USE_MOCK) {
      if (status) return mockApprovals.filter(a => a.status === status);
      return mockApprovals;
    }
    const { apiClient } = await import('./api');
    const query = status ? `?status=${status}` : '';
    return apiClient.get(`/approvals${query}`);
  },

  async get(id: string): Promise<Approval | undefined> {
    if (USE_MOCK) return mockApprovals.find(a => a.id === id);
    const { apiClient } = await import('./api');
    return apiClient.get(`/approvals/${id}`);
  },

  async approve(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'approved', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    const { apiClient } = await import('./api');
    return apiClient.post(`/approvals/${id}/approve`, { comment });
  },

  async reject(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'rejected', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    const { apiClient } = await import('./api');
    return apiClient.post(`/approvals/${id}/reject`, { comment });
  },

  async requestRevision(id: string, comment: string): Promise<Approval> {
    if (USE_MOCK) {
      const approval = mockApprovals.find(a => a.id === id);
      return { ...approval!, status: 'revision', reviewerComment: comment, reviewedAt: new Date().toISOString() };
    }
    const { apiClient } = await import('./api');
    return apiClient.post(`/approvals/${id}/revision`, { comment });
  },
};
