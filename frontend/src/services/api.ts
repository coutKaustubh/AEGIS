const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const ACCESS_TOKEN_KEY = 'aegis_access_token';
const REFRESH_TOKEN_KEY = 'aegis_refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(access: string, refresh?: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refresh) return null;
  const response = await fetch(`${API_BASE}/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    clearTokens();
    return null;
  }
  const payload = await response.json() as { access?: string; refresh?: string };
  if (!payload.access) {
    clearTokens();
    return null;
  }
  setTokens(payload.access, payload.refresh || refresh);
  return payload.access;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const { method = 'GET', body, headers = {}, isFormData = false } = options;
  const token = getAccessToken();

  const config: RequestInit = {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body !== undefined) {
    config.body = isFormData ? body as BodyInit : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (error) {
    const detail = error instanceof TypeError
      ? `Cannot reach backend at ${API_BASE}. Ensure the Django server is running on port 8000.`
      : error instanceof Error ? error.message : 'Network request failed.';
    throw new Error(detail);
  }

  if (response.status === 401 && retry && await refreshAccessToken()) {
    return request<T>(endpoint, options, false);
  }

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = await response.json() as { detail?: string; message?: string; [key: string]: unknown };
      const fieldErrors = Object.entries(payload)
        .filter(([key]) => !['detail', 'message'].includes(key))
        .flatMap(([key, value]) => Array.isArray(value) ? value.map((item) => `${key}: ${String(item)}`) : [`${key}: ${String(value)}`]);
      detail = payload.detail || payload.message || fieldErrors.join('; ') || detail;
    } catch {
      // Keep the HTTP status when the server did not return JSON.
    }
    throw new Error(`API Error: ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function streamSSE(
  endpoint: string,
  onEvent: (event: Record<string, unknown>) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Accept: 'text/event-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal,
    });
  } catch (error) {
    const detail = error instanceof TypeError
      ? `Cannot reach backend at ${API_BASE}. Ensure the Django server is running on port 8000.`
      : error instanceof Error ? error.message : 'SSE connection failed.';
    throw new Error(detail);
  }
  if (!response.ok || !response.body) {
    throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    for (const frame of frames) {
      const data = frame.split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data) continue;
      try {
        onEvent(JSON.parse(data) as Record<string, unknown>);
      } catch {
        // Ignore malformed keepalive/data frames.
      }
    }
    if (done) break;
  }
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body }),
  postForm: <T>(endpoint: string, body: FormData) => request<T>(endpoint, { method: 'POST', body, isFormData: true }),
  put: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PUT', body }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};

export { USE_MOCK, API_BASE };
