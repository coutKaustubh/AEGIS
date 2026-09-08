import { USE_MOCK } from './api';
import { mockAgentExecutions } from '@/data/mock-data';
import type { AgentExecution } from '@/types/agent';

interface TaskRecord {
  id: string;
  request_text: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  model_used: string;
  created_at: string;
  updated_at: string;
  result: Record<string, unknown>;
}

function toExecution(task: TaskRecord): AgentExecution {
  const status: AgentExecution['status'] = task.status === 'success' ? 'completed' : task.status === 'queued' ? 'pending' : task.status === 'running' ? 'running' : 'failed';
  const events = Array.isArray(task.result?.trace) ? task.result.trace as Array<Record<string, unknown>> : [];
  const nodes = events.map((event, index) => ({
    id: `event-${index}`,
    name: String(event.step || event.event || 'AI event'),
    type: 'reasoning' as const,
    status,
    model: task.model_used,
    detail: String(event.message || event.event || ''),
    position: { x: 80 + (index % 3) * 220, y: 80 + Math.floor(index / 3) * 130 },
  }));
  return {
    id: task.id,
    taskId: task.id,
    taskTitle: task.request_text,
    taskType: 'AI task',
    status,
    startedAt: task.created_at,
    completedAt: status === 'completed' || status === 'failed' ? task.updated_at : undefined,
    duration: 'backend tracked',
    nodes,
    edges: nodes.slice(1).map((node, index) => ({ id: `edge-${index}`, source: nodes[index].id, target: node.id })),
    timeline: nodes.map((node) => ({ id: node.id, nodeId: node.id, nodeName: node.name, action: node.detail || node.name, timestamp: task.updated_at, status })),
  };
}

export const agentService = {
  async listExecutions(): Promise<AgentExecution[]> {
    if (USE_MOCK) return mockAgentExecutions;
    const { apiClient } = await import('./api');
    const tasks = await apiClient.get<TaskRecord[]>('/chats/tasks/');
    return tasks.map(toExecution);
  },

  async getExecution(id: string): Promise<AgentExecution | undefined> {
    if (USE_MOCK) return mockAgentExecutions.find(e => e.id === id);
    const { apiClient } = await import('./api');
    const task = await apiClient.get<TaskRecord>(`/chats/tasks/${id}/`);
    return toExecution(task);
  },
};
