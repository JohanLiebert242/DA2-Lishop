const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 1;
const DEFAULT_RETRY_DELAY_MS = 1000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503]);
const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export interface GenerateProductImageOptions {
  productName: string;
  productDescription?: string;
  categoryName?: string;
  openAiApiKey: string;
  unsplashAccessKey: string;
  timeoutMs?: number;
  requestLabel?: string;
  logger?: {
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
  };
}

export interface GeneratedImage {
  url: string;
  source: 'unsplash' | 'placeholder';
}

async function generateSearchQuery(
  options: Pick<GenerateProductImageOptions, 'productName' | 'productDescription' | 'categoryName' | 'openAiApiKey' | 'logger'>,
): Promise<string> {
  const prompt = [
    'You are a product image search assistant.',
    'Given a product name, description, and category, generate a short English search query (3-6 words)',
    'to find a matching product photo on a stock image website.',
    'Return ONLY the search query, nothing else. No quotes, no punctuation.',
    '',
    `Product: ${options.productName}`,
    options.productDescription ? `Description: ${options.productDescription.slice(0, 200)}` : '',
    options.categoryName ? `Category: ${options.categoryName}` : '',
  ].filter(Boolean).join('\n');

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      input: [{ role: 'user', content: [{ type: 'input_text', text: prompt }] }],
      max_output_tokens: 50,
    }),
  });

  if (!response.ok) throw new Error(`OpenAI search query generation failed: HTTP ${response.status}`);

  const payload = (await response.json()) as { output_text?: string; output?: unknown };
  const text = extractOutputText(payload).trim();
  return text || options.productName;
}

export async function searchUnsplashImage(
  query: string,
  accessKey: string,
): Promise<{ url: string; photographer: string } | null> {
  const url = `${UNSPLASH_SEARCH_URL}?query=${encodeURIComponent(query)}&per_page=3&orientation=squarish`;
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    results?: Array<{
      urls: { regular: string; small: string };
      user: { name: string };
    }>;
  };

  const photo = payload.results?.[0];
  if (!photo?.urls) return null;

  return { url: photo.urls.small, photographer: photo.user.name };
}

export async function generateProductImage(
  options: GenerateProductImageOptions,
): Promise<GeneratedImage> {
  const { logger, requestLabel = 'admin.generateProductImage' } = options;
  let query: string;

  try {
    query = await generateSearchQuery(options);
  } catch (err) {
    logger?.warn?.(`[${requestLabel}] failed to generate search query, falling back to product name`, {
      error: err instanceof Error ? err.message : String(err),
    });
    query = options.productName;
  }

  logger?.warn?.(`[${requestLabel}] generated search query: "${query}"`);

  const unsplashKey = options.unsplashAccessKey?.trim();
  if (!unsplashKey) {
    logger?.warn?.(`[${requestLabel}] no Unsplash access key configured, using placeholder`);
    return { url: '', source: 'placeholder' };
  }

  const result = await searchUnsplashImage(query, unsplashKey);
  if (!result) {
    logger?.warn?.(`[${requestLabel}] Unsplash returned no results for "${query}"`);
    return { url: '', source: 'placeholder' };
  }

  logger?.warn?.(`[${requestLabel}] found image from Unsplash (${result.photographer}): ${result.url}`);
  return { url: result.url, source: 'unsplash' };
}

export async function downloadAndSaveImage(
  url: string,
  saveDir: string,
  filename: string,
): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: HTTP ${response.status}`);

  const contentType = response.headers.get('content-type') ?? '';

  const ext = ACCEPTED_IMAGE_TYPES.has(contentType)
    ? contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
    : 'jpg';

  const fullFilename = `${filename}.${ext}`;
  const buffer = Buffer.from(await response.arrayBuffer());

  const fs = await import('fs/promises');
  await fs.mkdir(saveDir, { recursive: true });
  await fs.writeFile(`${saveDir}/${fullFilename}`, buffer);

  return fullFilename;
}

function extractOutputText(payload: { output_text?: string; output?: unknown }): string {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return '';

  for (const item of payload.output) {
    if (!item || typeof item !== 'object') continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== 'object') continue;
      const text = (contentItem as { text?: unknown }).text;
      if (typeof text === 'string') return text;
    }
  }
  return '';
}
