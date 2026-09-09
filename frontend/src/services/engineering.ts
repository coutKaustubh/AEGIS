import { apiClient, streamSSE } from './api';

export type Project = { id: string; project_code: string; name: string; description: string; unit_name: string; area_name: string; status: string; current_revision: string };
export type Equipment = { id: string; project: string; tag: string; name: string; equipment_type: string; service: string; status: string; specifications: Record<string, unknown> };
export type Diagram = { id: string; project: string; diagram_number: string; name: string; diagram_type: 'PFD' | 'PID'; canvas_data: { nodes?: any[]; connections?: any[]; viewport?: any }; status: string };
export const engineering = {
  projects: () => apiClient.get<Project[]>('/engineering/projects/'),
  createProject: (body: Partial<Project>) => apiClient.post<Project>('/engineering/projects/', body),
  equipment: (project: string) => apiClient.get<Equipment[]>(`/engineering/equipment/?project=${project}`),
  createEquipment: (body: Partial<Equipment>) => apiClient.post<Equipment>('/engineering/equipment/', body),
  lines: (project: string) => apiClient.get<any[]>(`/engineering/lines/?project=${project}`),
  diagrams: (project: string) => apiClient.get<Diagram[]>(`/engineering/diagrams/?project=${project}`),
  createDiagram: (body: Partial<Diagram>) => apiClient.post<Diagram>('/engineering/diagrams/', body),
  updateDiagram: (id: string, body: Partial<Diagram>) => apiClient.patch<Diagram>(`/engineering/diagrams/${id}/`, body),
  validateDiagram: (id: string) => apiClient.post<any>(`/engineering/diagrams/${id}/validate/`, {}),
  calculate: (body: any) => apiClient.post<any>('/engineering/calculate/', body),
  report: (project_id: string) => apiClient.post<any>('/engineering/reports/', { project_id }),
  createHazop: (body: any) => apiClient.post<any>('/engineering/hazop/studies/', body),
  createMoc: (body: any) => apiClient.post<any>('/engineering/moc/', body),
  events: (project: string, onEvent: (event: Record<string, unknown>) => void, signal: AbortSignal) => streamSSE(`/engineering/events/?project=${encodeURIComponent(project)}`, onEvent, signal),
  compareRevisions: (left: any, right: any) => apiClient.post<any>('/engineering/revisions/compare/', { left, right }),
};
