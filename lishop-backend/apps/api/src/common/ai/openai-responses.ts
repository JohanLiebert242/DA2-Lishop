const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
export const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 400;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

export interface OpenAiTextRequestOptions {
  apiKey: string;
  model?: string;
  instructions: string;
  inputText: string;
  maxOutputTokens: number;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
}

export function extractOpenAiOutputText(payload: { output_text?: string; output?: unknown }): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return '';

  const parts: string[] = [];
  for (const item of payload.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === 'string') parts.push(text);
    }
  }

  return parts.join('\n');
}

export async function requestOpenAiText(options: OpenAiTextRequestOptions): Promise<string> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: options.model || DEFAULT_OPENAI_MODEL,
          instructions: options.instructions,
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: options.inputText,
                },
              ],
            },
          ],
          max_output_tokens: options.maxOutputTokens,
        }),
      });

      if (!response.ok) {
        if (attempt < retries && RETRYABLE_STATUS_CODES.has(response.status)) {
          await sleep(retryDelayMs * (attempt + 1));
          continue;
        }
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = extractOpenAiOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');
      return text;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= retries) {
        throw error;
      }
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('OpenAI request failed');
}

function isRetryableError(error: unknown) {
  return error instanceof Error && (error.name === 'AbortError' || error.message.includes('fetch'));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
