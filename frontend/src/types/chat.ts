export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  tokenCount?: number;
  latencyMs?: number;
  attachments?: Attachment[];
  citations?: Citation[];
  artifacts?: GeneratedArtifact[];
  toolCalls?: ToolCall[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'document' | 'image' | 'code';
  size: number;
  url?: string;
}

export interface Citation {
  id: string;
  documentName: string;
  page: number;
  relevance: number;
  snippet: string;
}

export interface GeneratedArtifact {
  id: string;
  name: string;
  type: 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'code' | 'markdown';
  size: number;
  hash?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  result?: string;
}

export interface Conversation {
  id: string;
  title: string;
  taskType: string;
  model: string;
  status: 'active' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface TaskInfo {
  id: string;
  type: string;
  model: string;
  status: 'active' | 'completed' | 'failed' | 'pending';
  startedAt: string;
  duration: string;
}

export interface AgentActivity {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  status: 'completed' | 'running' | 'pending';
}
