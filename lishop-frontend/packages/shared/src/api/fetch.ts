const DEFAULT_AUTH_URL = 'http://localhost:3001';

export function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return /(?:^|;\s*)lishop_session=1(?:;|$)/.test(document.cookie);
}

export function createApiFetch(apiUrl: string, authUrl = DEFAULT_AUTH_URL) {
  async function doRequest(path: string, init: RequestInit): Promise<Response> {
    // Avoid hanging SSR (and E2E) when the API is down by applying a bounded timeout
    // unless the caller already provided a signal.
    const timeoutMs = 8000;
    const controller = init.signal ? null : new AbortController();
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

    try {
      return await fetch(`${apiUrl}${path}`, {
        credentials: 'include',
        ...init,
        signal: init.signal ?? controller?.signal,
        headers: {
          ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers as Record<string, string> | undefined),
        },
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  return async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res = await doRequest(path, init);

    if (res.status === 401) {
      const refreshRes = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!refreshRes.ok) {
        if (typeof window !== 'undefined') window.location.href = `${authUrl}/login`;
        throw new Error('Phiên đăng nhập đã hết hạn');
      }
      res = await doRequest(path, init);
    }

    if (res.status === 204) return undefined as T;
    const json = (await res.json()) as { data?: T; message?: string };
    if (!res.ok) throw new Error(json.message ?? 'Yêu cầu không thành công');
    return (json.data ?? json) as T;
  };
}
