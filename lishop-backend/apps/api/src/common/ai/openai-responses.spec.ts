import { extractOpenAiOutputText, requestOpenAiText } from './openai-responses';

describe('openai-responses helper', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('extracts text from output_text or content parts', () => {
    expect(extractOpenAiOutputText({ output_text: 'hello' })).toBe('hello');
    expect(
      extractOpenAiOutputText({
        output: [{ content: [{ text: 'foo' }, { text: 'bar' }] }],
      }),
    ).toBe('foo\nbar');
  });

  it('retries retryable status codes and eventually returns text', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ output_text: 'worked after retry' }),
      }) as any;

    const text = await requestOpenAiText({
      apiKey: 'sk-test',
      instructions: 'Test',
      inputText: 'Hello',
      maxOutputTokens: 50,
      retryDelayMs: 1,
    });

    expect(text).toBe('worked after retry');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('logs retry attempts and terminal failures through the shared logger', async () => {
    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 }) as any;

    await expect(requestOpenAiText({
      apiKey: 'sk-test',
      instructions: 'Test',
      inputText: 'Hello',
      maxOutputTokens: 50,
      retryDelayMs: 1,
      requestLabel: 'products.rerank',
      logger,
    })).rejects.toThrow('OpenAI request failed with status 500');

    expect(logger.warn).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('products.rerank'),
      expect.objectContaining({ attempt: 3 }),
    );
  });

  it('aborts long requests with timeout', async () => {
    jest.useFakeTimers();

    global.fetch = jest.fn((_input, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    ) as any;

    const request = requestOpenAiText({
      apiKey: 'sk-test',
      instructions: 'Test',
      inputText: 'Hello',
      maxOutputTokens: 50,
      timeoutMs: 10,
      retries: 0,
    });

    const assertion = expect(request).rejects.toThrow('aborted');
    await jest.advanceTimersByTimeAsync(20);
    await assertion;
  });
});
