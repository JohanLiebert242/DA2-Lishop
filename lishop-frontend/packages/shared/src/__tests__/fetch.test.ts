import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiFetch } from '../api/fetch';

describe('createApiFetch', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('uses a per-request timeout when provided', async () => {
    vi.useFakeTimers();

    const fetchSpy = vi.fn(
      async (_input: string, init?: RequestInit) =>
        new Promise<Response>((resolve, reject) => {
          const signal = init?.signal;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ data: { ok: true } }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
            9_000,
          );
        }),
    );

    vi.stubGlobal('fetch', fetchSpy);

    const apiFetch = createApiFetch('http://localhost:4000');
    const request = apiFetch<{ ok: boolean }>('/shopping/style-fit-advisor', {
      method: 'POST',
      body: JSON.stringify({ productId: 'p-1' }),
      timeoutMs: 12_000,
    });

    await vi.advanceTimersByTimeAsync(9_100);

    await expect(request).resolves.toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
