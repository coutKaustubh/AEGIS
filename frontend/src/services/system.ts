import { apiClient } from './api';

export interface SystemHealthResponse {
  django: string;
  database: string;
  ai_service: string;
  ai_detail?: { models?: Record<string, boolean>; network_policy?: string };
  network_policy: string;
}

export const systemService = {
  health: () => apiClient.get<SystemHealthResponse>('/system/health/'),
};
