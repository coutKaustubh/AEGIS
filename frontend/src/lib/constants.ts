export const APP_NAME = 'AEGIS';
export const APP_SUBTITLE = 'Sovereign AI Workbench';
export const APP_TAGLINE = 'Secure intelligence for sensitive operations.';

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: 'LayoutDashboard' },
  { label: 'Workspace', path: '/workspace', icon: 'MessageSquare' },
  { label: 'Engineering', path: '/engineering', icon: 'Wrench' },
  { type: 'divider' as const },
  { label: 'Documents', path: '/documents', icon: 'FileText' },
  { label: 'Knowledge', path: '/knowledge', icon: 'BookOpen' },
  { type: 'divider' as const },
  { label: 'Agents', path: '/agents', icon: 'Bot' },
  { label: 'Approvals', path: '/approvals', icon: 'CheckCircle' },
  { label: 'System', path: '/system', icon: 'Server' },
  { type: 'divider' as const },
  { label: 'Users', path: '/users', icon: 'Users', adminOnly: true },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
] as const;

export const DEPARTMENTS = [
  'Engineering',
  'Operations',
  'Safety',
  'Procurement',
  'Finance',
  'Management',
] as const;

export const DOCUMENT_TYPES = [
  'PDF',
  'DOCX',
  'XLSX',
  'PPTX',
  'DWG',
  'Image',
  'Text',
] as const;

export const CLASSIFICATIONS = ['INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'] as const;
