import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ShoppingStyleFitAdvisorService } from './shopping-style-fit-advisor.service';
import { ProductsService } from '../products/products.service';

const variants = [
  {
    id: 'v-s',
    productId: 'p1',
    sku: 'AO-S',
    name: 'Size S',
    priceVnd: 300000,
    priceUsd: 1200,
    stock: 4,
    weightGrams: 400,
    attributes: { size: 'S', color: 'Den' },
    imageUrl: null,
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'v-m',
    productId: 'p1',
    sku: 'AO-M',
    name: 'Size M',
    priceVnd: 300000,
    priceUsd: 1200,
    stock: 8,
    weightGrams: 400,
    attributes: { size: 'M', color: 'Den' },
    imageUrl: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
] as any[];

const product = {
  id: 'p1',
  name: 'Ao blazer basic',
  slug: 'ao-blazer-basic',
  sku: 'AO-BLAZER',
  description: 'Ao blazer form gon, chat vai mem.',
  priceVnd: 300000,
  priceUsd: 1200,
  stock: 12,
  averageRating: 4.6,
  reviewCount: 17,
  categoryId: 'c1',
  category: { id: 'c1', name: 'Thoi trang', slug: 'thoi-trang' },
  brand: 'Lishop',
  images: [{ id: 'img1', url: 'https://example.com/a.jpg', alt: 'Ao blazer', isPrimary: true }],
  tags: [],
  variants,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ShoppingStyleFitAdvisorService', () => {
  let service: ShoppingStyleFitAdvisorService;
  let originalFetch: typeof global.fetch;
  const productsService = { findById: jest.fn() };
  const config = { get: jest.fn<string, [string]>((key: string) => (key === 'OPENAI_MODEL' ? 'gpt-5.2' : '')) };

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    productsService.findById.mockResolvedValue(product);
    config.get.mockImplementation((key: string) => (key === 'OPENAI_MODEL' ? 'gpt-5.2' : ''));
    const moduleRef = await Test.createTestingModule({
      providers: [
        ShoppingStyleFitAdvisorService,
        { provide: ProductsService, useValue: productsService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(ShoppingStyleFitAdvisorService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('uses OpenAI and returns a valid recommended variant', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'v-m',
          recommendedSize: 'M',
          confidence: 'high',
          fitSummary: 'Size M se vua vai va thoai mai.',
          reasons: ['Chieu cao va can nang phu hop size M'],
          styleTips: ['Phoi voi quan tay ong dung'],
          warnings: [],
        }),
      }),
    });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
      occasion: 'di lam',
    });

    expect(result.recommendedVariantId).toBe('v-m');
    expect(result.recommendedSize).toBe('M');
    expect(result.confidence).toBe('high');
    expect(result.fallback).toBe(false);
  });

  it('uses the real variant size when AI returns a conflicting recommended size', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'v-m',
          recommendedSize: 'XXL',
          confidence: 'high',
          fitSummary: 'Size XXL se dep.',
          reasons: ['AI returned a conflicting size label'],
          styleTips: [],
          warnings: [],
        }),
      }),
    });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(false);
    expect(result.recommendedVariantId).toBe('v-m');
    expect(result.recommendedSize).toBe('M');
  });

  it('includes product images in the OpenAI product context', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'v-m',
          recommendedSize: 'M',
          confidence: 'high',
          fitSummary: 'Size M se vua vai va thoai mai.',
          reasons: [],
          styleTips: [],
          warnings: [],
        }),
      }),
    });

    await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body);
    const text = body.input[0].content[0].text as string;

    expect(text).toContain('"images"');
    expect(text).toContain('https://example.com/a.jpg');
  });

  it('returns deterministic fallback when OpenAI key is missing', async () => {
    const result = await service.advise({
      productId: 'p1',
      heightCm: 169,
      weightKg: 61,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(result.recommendedVariantId).toBe('v-m');
    expect(result.recommendedSize).toBe('M');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('falls back when AI recommends a variant outside the product', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          recommendedVariantId: 'not-real',
          recommendedSize: 'XXL',
          confidence: 'high',
          fitSummary: 'Bad output',
          reasons: [],
          styleTips: [],
          warnings: [],
        }),
      }),
    });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(['v-s', 'v-m']).toContain(result.recommendedVariantId);
  });

  it('handles products without size variants', async () => {
    productsService.findById.mockResolvedValue({ ...product, variants: [] });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(result.fallback).toBe(true);
    expect(result.recommendedVariantId).toBeUndefined();
    expect(result.confidence).toBe('low');
    expect(result.warnings.join(' ')).toContain('size');
  });

  it('does not call OpenAI for products without size variants even when an API key exists', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    productsService.findById.mockResolvedValue({ ...product, variants: [] });

    const result = await service.advise({
      productId: 'p1',
      heightCm: 170,
      weightKg: 62,
      preferredFit: 'regular',
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.recommendedVariantId).toBeUndefined();
    expect(result.confidence).toBe('low');
  });
});
