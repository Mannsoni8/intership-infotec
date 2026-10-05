import { AuthUser, DocInfo, DocSummary } from './types';

const TOKEN_KEY = 'syncdoc-token';

// The login token is kept in sessionStorage: it is removed when the tab closes, and every
// tab has its own login (so you can test two users in two tabs of the same browser).
export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function failure(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return new ApiError(body.message || `Request failed (${res.status})`, res.status);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Can not reach the server. Is it running?', 0);
  }

  if (!res.ok) {
    // an expired login: tell the app so it can send the user to the login page
    if (res.status === 401 && token && !path.startsWith('/auth/')) {
      window.dispatchEvent(new Event('syncdoc-auth-expired'));
    }
    throw await failure(res);
  }
  return res.json() as Promise<T>;
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', { method: 'POST', ...json({ name, email, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', ...json({ email, password }) }),
  me: () => request<{ user: AuthUser }>('/auth/me'),

  listDocs: () => request<DocSummary[]>('/documents'),
  getDoc: (id: string) => request<DocInfo>(`/documents/${id}`),
  createDoc: (title: string) => request<DocInfo>('/documents', { method: 'POST', ...json({ title }) }),
  importMarkdown: (title: string, markdown: string) =>
    request<DocInfo>('/documents/import', { method: 'POST', ...json({ title, markdown }) }),
  renameDoc: (id: string, title: string) =>
    request<DocInfo>(`/documents/${id}`, { method: 'PATCH', ...json({ title }) }),
  deleteDoc: (id: string) => request<{ message: string }>(`/documents/${id}`, { method: 'DELETE' }),
  shareDoc: (id: string, email: string) =>
    request<DocInfo>(`/documents/${id}/share`, { method: 'POST', ...json({ email }) }),
  unshareDoc: (id: string, userId: string) =>
    request<DocInfo>(`/documents/${id}/share/${userId}`, { method: 'DELETE' }),
};

// downloads a pdf / html / md export (the login token must be sent, so we can not use a normal link)
export async function downloadExport(id: string, format: 'pdf' | 'html' | 'md', fallbackName: string): Promise<void> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`/api/documents/${id}/export/${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError('Can not reach the server. Is it running?', 0);
  }
  if (!res.ok) throw await failure(res);

  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match ? match[1] : `${fallbackName}.${format}`;

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
