import { apiClient, streamSSE } from './api';

export interface ChatSessionRecord {
  id: string;
  chat_title: string;
  created_at: string;
  updated_at: string;
  chats?: ChatMessageRecord[];
}

export interface ChatMessageRecord {
  id: string;
  session: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AITaskRecord {
  id: string;
  execution_id: string | null;
  session: string;
  request_text: string;
  response_text: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  model_used: string;
  result: Record<string, unknown>;
  network: Record<string, unknown>;
  error: string;
  created_at: string;
  updated_at: string;
}

export interface ArtifactRecord {
  id: string;
  task: string;
  name: string;
  path: string;
  artifact_type: string;
  verification_status: string;
  sha256: string;
  metadata: Record<string, unknown>;
  download_url: string;
  created_at: string;
}

export interface PermissionRecord {
  id: string;
  request_id: string;
  task: string;
  action: string;
  tool: string;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  decided_by: number | null;
  decision_reason: string;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export const chatService = {
  listSessions: () => apiClient.get<ChatSessionRecord[]>('/chats/sessions/'),
  createSession: (chat_title = 'New Chat') => apiClient.post<ChatSessionRecord>('/chats/sessions/', { chat_title }),
  getSession: (id: string) => apiClient.get<ChatSessionRecord>(`/chats/sessions/${id}/`),
  renameSession: (id: string, chat_title: string) => apiClient.patch<ChatSessionRecord>(`/chats/sessions/${id}/`, { chat_title }),
  deleteSession: (id: string) => apiClient.delete<void>(`/chats/sessions/${id}/`),
  getMessages: (id: string) => apiClient.get<ChatMessageRecord[]>(`/chats/sessions/${id}/chats/`),
  ask: (content: string, sessionId?: string, files: File[] = [], options: Record<string, unknown> = {}) => {
    const form = new FormData();
    form.append('content', content);
    if (sessionId) form.append('chat_session_id', sessionId);
    form.append('metadata', JSON.stringify(options));
    files.forEach((file) => form.append('files', file, file.name));
    return apiClient.postForm<{ chat_session_id: string; user_message: ChatMessageRecord; task: AITaskRecord }>('/chats/ask/', form);
  },
  getTask: (id: string) => apiClient.get<AITaskRecord>(`/chats/tasks/${id}/`),
  getArtifacts: (id: string) => apiClient.get<ArtifactRecord[]>(`/chats/tasks/${id}/artifacts/`),
  getNetwork: (id: string) => apiClient.get<Record<string, unknown>>(`/chats/tasks/${id}/network/`),
  getPermissions: (id: string) => apiClient.get<PermissionRecord[]>(`/chats/tasks/${id}/permissions/`),
  decidePermission: (taskId: string, requestId: string, decision: 'approve' | 'deny', reason = '') =>
    apiClient.post<PermissionRecord>(`/chats/tasks/${taskId}/permissions/${requestId}/${decision}/`, { reason }),
  streamEvents: (id: string, onEvent: (event: Record<string, unknown>) => void, signal?: AbortSignal) =>
    streamSSE(`/chats/tasks/${id}/events/`, onEvent, signal),
};

