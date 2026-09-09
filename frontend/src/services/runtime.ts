import { apiClient } from './api';

/** Typed access to platform capabilities exposed by the local runtime bridge. */
export const runtimeService = {
  models: () => apiClient.get('/chats/models/'),
  knowledgeSearch: (query: string, top_k = 5) => apiClient.post('/chats/knowledge/search/', { query, top_k }),
  knowledgeAsk: (query: string, top_k = 5) => apiClient.post('/chats/knowledge/ask/', { query, top_k }),
  memoryPut: (text: string, scope = 'global', metadata = {}) => apiClient.post('/chats/memory/', { text, scope, metadata }),
  memorySearch: (query: string, scope?: string) => apiClient.get(`/chats/memory/search/?query=${encodeURIComponent(query)}${scope ? `&scope=${encodeURIComponent(scope)}` : ''}`),
  workflows: () => apiClient.get('/chats/workflows/'),
  validateWorkflow: (plan: unknown) => apiClient.post('/chats/workflows/validate/', plan),
  executeWorkflow: (plan: unknown, approve_high_risk = false) => apiClient.post('/chats/workflows/execute/', { ...plan as object, approve_high_risk }),
  jobs: (payload: unknown) => apiClient.post('/chats/jobs/', payload),
  job: (id: string) => apiClient.get(`/chats/jobs/${id}/`),
  cancelJob: (id: string) => apiClient.delete(`/chats/jobs/${id}/`),
  evaluationSummary: () => apiClient.get('/chats/evaluations/summary/'),
  kubernetesManifest: (params: Record<string, string | number | boolean> = {}) => apiClient.get(`/chats/kubernetes/manifest/?${new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)]))}`),
};
