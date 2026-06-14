import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { ShoppingConciergeService } from './shopping-concierge.service';
import { RedisService } from '../redis/redis.service';

const productA: any = {
  id: 'p1',
  name: 'Ao khoac di lam',
  slug: 'ao-khoac-di-lam',
  description: 'Ao khoac gon gang phu hop cong so.',
  priceVnd: 450000,
  priceUsd: 1800,
  stock: 5,
  averageRating: 4.7,
  reviewCount: 12,
  brand: 'Lishop',
  category: { id: 'c1', name: 'Thoi trang', slug: 'thoi-trang' },
  images: [{ id: 'img1', url: 'https://example.com/a.jpg', alt: 'Ao khoac', isPrimary: true }],
};

const productB: any = {
  id: 'p2',
  name: 'Quan tay cong so',
  slug: 'quan-tay-cong-so',
  description: 'Quan tay de phoi do hang ngay.',
  priceVnd: 390000,
  priceUsd: 1560,
  stock: 4,
  averageRating: 4.5,
  reviewCount: 8,
  brand: 'Lishop',
  category: { id: 'c1', name: 'Thoi trang', slug: 'thoi-trang' },
  images: [{ id: 'img2', url: 'https://example.com/b.jpg', alt: 'Quan tay', isPrimary: true }],
};

const outOfStockProduct: any = {
  ...productB,
  id: 'p3',
  name: 'Giay het hang',
  slug: 'giay-het-hang',
  stock: 0,
};

describe('ShoppingConciergeService', () => {
  let service: ShoppingConciergeService;
  let originalFetch: typeof global.fetch;
  const productsService = {
    findMany: jest.fn(),
    findFeatured: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };
  const redisService = { get: jest.fn(), setex: jest.fn() };

  beforeEach(async () => {
    originalFetch = global.fetch;
    global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    redisService.get.mockResolvedValue(null);
    redisService.setex.mockResolvedValue(undefined);
    productsService.findMany.mockResolvedValue({ items: [productA, productB], nextCursor: null });
    productsService.findFeatured.mockResolvedValue([productA, productB]);

    const module = await Test.createTestingModule({
      providers: [
        ShoppingConciergeService,
        { provide: ProductsService, useValue: productsService },
        { provide: ConfigService, useValue: config },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get(ShoppingConciergeService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('uses OpenAI to produce a structured concierge response', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          reply: 'Combo nay phu hop di lam va nam trong ngan sach.',
          cartPlan: [
            { productId: 'p1', quantity: 1, reason: 'Ao khoac tao phong cach gon gang.' },
            { productId: 'p2', quantity: 1, reason: 'Quan tay de phoi voi ao khoac.' },
          ],
          actions: [
            { type: 'ADD_TO_CART', label: 'Them combo vao gio' },
            { type: 'VIEW_PRODUCT', label: 'Xem Ao khoac di lam', productId: 'p1' },
          ],
        }),
      }),
    });

    const result = await service.ask('Toi can combo di lam duoi 1 trieu');

    expect(productsService.findMany).toHaveBeenCalledWith({ q: 'Toi can combo di lam duoi 1 trieu', limit: 8 });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
    expect(result.fallback).toBe(false);
    expect(result.reply).toContain('Combo');
    expect(result.items).toHaveLength(2);
    expect(result.cartPlan).toHaveLength(2);
    expect(result.cartPlan[0]).toEqual(expect.objectContaining({ productId: 'p1', quantity: 1 }));
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const text = body.input[0].content[0].text as string;
    expect(text).toContain('"name": "Ao khoac di lam"');
    expect(text).not.toContain('https://example.com/a.jpg');
  });

  it('returns fallback cart plan when OpenAI key is missing', async () => {
    const result = await service.ask('Can mua do di lam');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.fallback).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.cartPlan).toHaveLength(2);
    expect(result.cartPlan.every((item) => item.quantity === 1)).toBe(true);
  });

  it('falls back when OpenAI fails', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

    const result = await service.ask('Can mua do di lam');

    expect(result.fallback).toBe(true);
    expect(result.cartPlan).toHaveLength(2);
  });

  it('excludes out-of-stock products from the cart plan', async () => {
    productsService.findMany.mockResolvedValue({ items: [productA, outOfStockProduct], nextCursor: null });

    const result = await service.ask('Can mua outfit');

    expect(result.items).toHaveLength(2);
    expect(result.cartPlan).toHaveLength(1);
    expect(result.cartPlan[0]?.productId).toBe('p1');
  });

  it('falls back to featured products when keyword search returns no matches', async () => {
    productsService.findMany.mockResolvedValue({ items: [], nextCursor: null });

    const result = await service.ask('Toi can mot bo qua tang cho sep');

    expect(productsService.findFeatured).toHaveBeenCalledWith(8);
    expect(result.items).toHaveLength(2);
    expect(result.cartPlan).toHaveLength(2);
    expect(result.reply).toContain('goi y');
  });

  it('drops invalid productId from AI actions', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          reply: 'Da loc action.',
          cartPlan: [{ productId: 'p1', quantity: 1, reason: 'Hop' }],
          actions: [
            { type: 'VIEW_PRODUCT', label: 'Xem sai', productId: 'not-real' },
            { type: 'VIEW_PRODUCT', label: 'Xem dung', productId: 'p1' },
          ],
        }),
      }),
    });

    const result = await service.ask('Toi can combo di lam');

    expect(result.actions).toEqual([
      { type: 'VIEW_PRODUCT', label: 'Xem dung', productId: 'p1' },
    ]);
  });

  it('uses cached concierge response when available', async () => {
    redisService.get.mockResolvedValue(JSON.stringify({
      reply: 'cached concierge',
      cartPlan: [{ productId: 'p1', name: productA.name, slug: productA.slug, quantity: 1, priceVnd: productA.priceVnd, imageUrl: 'https://example.com/a.jpg', reason: 'cached' }],
      actions: [{ type: 'ADD_TO_CART', label: 'Them goi y vao gio' }],
      fallback: false,
    }));

    const result = await service.ask('Can mua do di lam');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.reply).toBe('cached concierge');
    expect(result.items).toHaveLength(2);
  });
});
