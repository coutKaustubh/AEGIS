import { USE_MOCK } from './api';
import { mockAgentExecutions } from '@/data/mock-data';
import type { AgentExecution } from '@/types/agent';

export const agentService = {
  async listExecutions(): Promise<AgentExecution[]> {
    if (USE_MOCK) return mockAgentExecutions;
    const { apiClient } = await import('./api');
    return apiClient.get('/agents/executions');
  },

  async getExecution(id: string): Promise<AgentExecution | undefined> {
    if (USE_MOCK) return mockAgentExecutions.find(e => e.id === id);
    const { apiClient } = await import('./api');
    return apiClient.get(`/agents/executions/${id}`);
  },
};
