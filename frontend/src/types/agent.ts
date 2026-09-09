export interface Agent {
  id: string;
  name: string;
  type: 'master' | 'reasoning' | 'ocr' | 'vision' | 'rag' | 'code' | 'document' | 'review';
  description: string;
  model: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
}

export interface AgentExecution {
  id: string;
  taskId: string;
  taskTitle: string;
  taskType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  timeline: AgentTimelineEvent[];
}

export interface AgentNode {
  id: string;
  name: string;
  type: 'user' | 'master' | 'planner' | 'ocr' | 'vision' | 'rag' | 'reasoning' | 'document' | 'review';
  status: 'pending' | 'running' | 'completed' | 'failed';
  model?: string;
  tool?: string;
  duration?: string;
  detail?: string;
  position: { x: number; y: number };
}

export interface AgentEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface AgentTimelineEvent {
  id: string;
  nodeId: string;
  nodeName: string;
  action: string;
  timestamp: string;
  duration?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}
