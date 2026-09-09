import type { User } from '@/types/system';
import { apiClient, clearTokens, getAccessToken, setTokens, USE_MOCK } from './api';

const AUTH_STORAGE_KEY = 'aegis_auth_session';
const USERS_STORAGE_KEY = 'aegis_mock_users';

/**
 * Clearly fake demo credentials. This is intentionally isolated so the
 * implementation can be replaced by the Django authentication service later.
 * These are not production credentials and must never be reused outside demo mode.
 */
export const DEMO_CREDENTIALS = {
  admin: { identifier: 'admin@aegis.local', password: 'aegis-demo-admin' },
  employee: { identifier: 'EMP-1001', password: 'aegis-demo-employee' },
} as const;

export type EmployeeProvisioningInput = {
  name: string;
  email: string;
  department: string;
  role: 'employee';
  status: 'active' | 'inactive' | 'suspended';
  temporaryPassword?: string;
};

export type ProvisionedEmployee = User & { temporaryPassword: string };

export const INITIAL_MOCK_USERS: User[] = [
  {
    id: 'usr-admin-01',
    name: 'Rajesh Kumar',
    email: DEMO_CREDENTIALS.admin.identifier,
    role: 'admin',
    department: 'Engineering & Enclave Security',
    status: 'active',
    lastLogin: '2026-09-07T18:30:00Z',
  },
  {
    id: 'usr-emp-02',
    name: 'Priya Sharma',
    email: DEMO_CREDENTIALS.employee.identifier,
    role: 'employee',
    department: 'Safety & Regulatory Compliance',
    status: 'active',
    lastLogin: '2026-09-07T16:15:00Z',
  },
  {
    id: 'usr-emp-03',
    name: 'Vikram Singh',
    email: 'v.singh@bharatpetro.gov.in',
    role: 'employee',
    department: 'Refinery Operations — Unit 4',
    status: 'active',
    lastLogin: '2026-09-06T11:20:00Z',
  },
  {
    id: 'usr-emp-04',
    name: 'Ananya Roy',
    email: 'a.roy@bharatpetro.gov.in',
    role: 'employee',
    department: 'Equipment Procurement',
    status: 'active',
    lastLogin: '2026-09-05T09:40:00Z',
  },
  {
    id: 'usr-emp-05',
    name: 'Suresh Patel',
    email: 's.patel@bharatpetro.gov.in',
    role: 'employee',
    department: 'Predictive Maintenance',
    status: 'inactive',
    lastLogin: '2026-08-28T14:00:00Z',
  },
];

function getStoredUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_USERS));
      return INITIAL_MOCK_USERS;
    }
    const parsed = JSON.parse(raw) as Array<User & { temporaryPassword?: string }>;
    // Remove credentials written by older demo builds. Passwords must never
    // survive in browser storage or appear in the user directory.
    return parsed.map(({ temporaryPassword: _temporaryPassword, ...user }) => user);
  } catch {
    return INITIAL_MOCK_USERS;
  }
}

function saveStoredUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // localStorage might be unavailable
  }
}

export async function getCurrentUser(): Promise<User | null> {
  if (!USE_MOCK) {
    if (!getAccessToken()) return null;
    try {
      return normalizeUser(await apiClient.get<Record<string, unknown>>('/auth/me/'));
    } catch {
      clearTokens();
      return null;
    }
  }
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'admin';
}

export async function login(identifier: string, password = ''): Promise<User> {
  if (!USE_MOCK) {
    const payload = await apiClient.post<{ access: string; refresh: string }>('/auth/login/', {
      username: identifier.trim(),
      password,
    });
    setTokens(payload.access, payload.refresh);
    return normalizeUser(await apiClient.get<Record<string, unknown>>('/auth/me/'));
  }
  // Simulated local network latency
  await new Promise((resolve) => setTimeout(resolve, 300));

  const cleanIdentifier = identifier.trim().toLowerCase();
  const users = getStoredUsers();

  const isAdminDemo =
    cleanIdentifier === DEMO_CREDENTIALS.admin.identifier &&
    password === DEMO_CREDENTIALS.admin.password;
  const isEmployeeDemo =
    cleanIdentifier === DEMO_CREDENTIALS.employee.identifier.toLowerCase() &&
    password === DEMO_CREDENTIALS.employee.password;
  const expectedDemoId = isAdminDemo
    ? 'usr-admin-01'
    : isEmployeeDemo
      ? 'usr-emp-02'
      : null;
  const matchedUser = expectedDemoId
    ? users.find((u) => u.id === expectedDemoId)
    : null;

  if (!matchedUser) {
    throw new Error('Invalid enclave credentials. Contact an administrator if you need access.');
  }

  if (matchedUser.status === 'inactive' || matchedUser.status === 'suspended') {
    throw new Error('This enclave account is inactive. Please contact the Enclave Administrator.');
  }

  const sessionUser: User = {
    ...matchedUser,
    lastLogin: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  } catch {
    // ignore
  }

  return sessionUser;
}

export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    clearTokens();
  }
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('aegis_active_session_id');
  } catch {
    // ignore
  }
  if (USE_MOCK) await new Promise((resolve) => setTimeout(resolve, 150));
}

export function getManagedUsers(): User[] {
  return getStoredUsers();
}

export async function listEmployees(): Promise<User[]> {
  if (!USE_MOCK) {
    const users = await apiClient.get<Record<string, unknown>[]>('/auth/employees/directory/');
    return users.map(normalizeUser);
  }
  return getStoredUsers();
}

export async function addEmployee(
  newUserData: EmployeeProvisioningInput,
): Promise<ProvisionedEmployee> {
  if (!USE_MOCK) {
    const password = newUserData.temporaryPassword || generateTemporaryPassword();
    const created = await apiClient.post<Record<string, unknown>>('/auth/employees/', {
      username: newUserData.email,
      email: newUserData.email,
      display_name: newUserData.name,
      password,
    });
    return { ...normalizeUser(created), temporaryPassword: password };
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  const current = getStoredUsers();
  const { temporaryPassword, ...persistedUserData } = newUserData;
  const newUser: User = {
    ...persistedUserData,
    id: `usr-emp-${Date.now().toString().slice(-4)}`,
    status: newUserData.status || 'active',
  };

  const updated = [newUser, ...current];
  saveStoredUsers(updated);
  return { ...newUser, temporaryPassword: temporaryPassword || generateTemporaryPassword() };
}

function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const suffix = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `AEGIS-${suffix}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function updateEmployeeStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<void> {
  if (!USE_MOCK) {
    await apiClient.patch(`/auth/employees/${id}/`, { is_active: status === 'active', status });
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  const current = getStoredUsers();
  const updated = current.map((u) => (u.id === id ? { ...u, status } : u));
  saveStoredUsers(updated);
}

export async function deleteEmployee(id: string): Promise<void> {
  if (!USE_MOCK) {
    await apiClient.delete(`/auth/employees/${id}/`);
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  const current = getStoredUsers();
  const updated = current.filter((u) => u.id !== id);
  saveStoredUsers(updated);
}

function normalizeUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id || raw.unique_id || raw.username || ''),
    name: String(raw.name || raw.display_name || raw.username || ''),
    email: String(raw.email || raw.username || ''),
    role: raw.role === 'admin' ? 'admin' : 'employee',
    department: String(raw.department || ''),
    status: raw.status === 'inactive' || raw.status === 'suspended' ? raw.status : 'active',
    lastLogin: typeof raw.last_login === 'string' ? raw.last_login : undefined,
  };
}
