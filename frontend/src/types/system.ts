export type SystemComponentStatus = 'operational' | 'warning' | 'offline';

export interface SystemComponent {
  id: string;
  name: string;
  status: SystemComponentStatus;
  detail?: string;
  lastChecked: string;
}

export interface SystemHealth {
  components: SystemComponent[];
  gpuUtilization: number;
  cpuUtilization: number;
  memoryUsage: number;
  memoryTotal: number;
  storageUsage: number;
  storageTotal: number;
  uptime: string;
}

export interface SovereigntyMetrics {
  networkStatus: 'isolated' | 'connected' | 'warning';
  externalApiCalls: number;
  cloudAiRequests: number;
  externalDataTransfer: number;
  localAiOperations: number;
  localOcrOperations: number;
  localRagQueries: number;
}

export interface DashboardMetrics {
  activeAiTasks: number;
  documentsProcessed: number;
  knowledgeBaseDocuments: number;
  pendingApprovals: number;
}

export interface RecentTask {
  id: string;
  task: string;
  type: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  model: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'employee' | 'operator' | 'viewer' | 'auditor';
  department: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
}
