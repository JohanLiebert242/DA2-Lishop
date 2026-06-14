import { Test } from '@nestjs/testing';
import { ChatbotService } from './chatbot.service';
import { FaqRepository } from './faq.repository';
import { ProductsService } from '../products/products.service';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { RedisService } from '../redis/redis.service';

const mockProduct: any = {
  id: 'p1',
  name: 'iPhone 15',
  slug: 'iphone-15',
  priceVnd: 20000000,
  averageRating: 4.8,
  images: [{ url: 'https://img.url', isPrimary: true }],
};

const mockFaq: any = {
  id: 'faq1',
  question: 'Chính sách đổi trả?',
  answer: '7 ngày đổi trả',
  category: 'RETURN',
  sortOrder: 0,
  isPublished: true,
};

describe('ChatbotService', () => {
  let service: ChatbotService;

  const productsService = { findMany: jest.fn() };
  const faqRepo = { search: jest.fn() };
  const config = { get: jest.fn() };
  const ordersService = { findMyOrders: jest.fn() };
  const redisService = { get: jest.fn(), setex: jest.fn() };
  const originalFetch = global.fetch;

  beforeEach(async () => {
    productsService.findMany.mockResolvedValue({ items: [], nextCursor: null });
    faqRepo.search.mockResolvedValue([]);
    ordersService.findMyOrders.mockResolvedValue([]);
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    global.fetch = jest.fn();
    redisService.get.mockResolvedValue(null);
    redisService.setex.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ProductsService, useValue: productsService },
        { provide: FaqRepository, useValue: faqRepo },
        { provide: ConfigService, useValue: config },
        { provide: OrdersService, useValue: ordersService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();
    service = module.get(ChatbotService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('uses OpenAI when configured and returns AI text with product context', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    productsService.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'iPhone 15 phu hop neu ban can camera tot.' }),
    });

    const result = await service.reply('tu van iphone chup anh dep');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
    expect(result.type).toBe('products');
    expect(result.reply).toContain('iPhone 15');
    expect(result.data).toHaveLength(1);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const text = body.input[0].content[0].text as string;
    expect(text).toContain('"name": "iPhone 15"');
    expect(text).not.toContain('https://img.url');
  });

  it('adds recent order context for authenticated tracking questions', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    ordersService.findMyOrders.mockResolvedValue([
      {
        id: 'o1',
        orderNumber: 'LS-123',
        status: 'SHIPPED',
        shippingProvider: 'GHN',
        trackingNumber: 'GHN001',
        totalVnd: 1000000,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        items: [{ productName: 'iPhone 15', quantity: 1 }],
        shipment: { deliveredAt: null },
      },
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ output_text: 'Don LS-123 dang duoc GHN van chuyen.' }),
    });

    await service.reply('theo doi don hang LS-123', { userId: 'u1' });

    expect(ordersService.findMyOrders).toHaveBeenCalledWith('u1');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(JSON.stringify(body)).toContain('LS-123');
    expect(JSON.stringify(body)).toContain('GHN001');
  });

  it('uses cached AI reply when available', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return 'sk-test';
      if (key === 'OPENAI_MODEL') return 'gpt-5.2';
      return '';
    });
    productsService.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    redisService.get.mockResolvedValue(JSON.stringify({ reply: 'cached chatbot reply' }));

    const result = await service.reply('tu van iphone chup anh dep');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.reply).toBe('cached chatbot reply');
    expect(result.type).toBe('products');
  });

  it('falls back to rule-based response when OpenAI is not configured', async () => {
    const result = await service.reply('theo doi don hang');

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.type).toBe('text');
    expect(result.reply).toContain('Đơn hàng');
  });

  it('returns products when message contains product keyword', async () => {
    productsService.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    const result = await service.reply('tìm điện thoại');
    expect(result.type).toBe('products');
    expect(result.data).toHaveLength(1);
  });

  it('reports no products when search returns empty', async () => {
    productsService.findMany.mockResolvedValue({ items: [], nextCursor: null });
    const result = await service.reply('tìm điện thoại');
    expect(result.type).toBe('products');
    expect(result.reply).toContain('Không tìm thấy');
  });

  it('maps primaryImage correctly from isPrimary image', async () => {
    productsService.findMany.mockResolvedValue({ items: [mockProduct], nextCursor: null });
    const result = await service.reply('giá bao nhiêu');
    const data = result.data as any[];
    expect(data[0]!.primaryImage).toBe('https://img.url');
  });

  it('maps primaryImage from first image when no isPrimary', async () => {
    const product = { ...mockProduct, images: [{ url: 'https://first.jpg', isPrimary: false }] };
    productsService.findMany.mockResolvedValue({ items: [product], nextCursor: null });
    const result = await service.reply('tìm sản phẩm');
    const data = result.data as any[];
    expect(data[0]!.primaryImage).toBe('https://first.jpg');
  });

  it('returns canned order response for order keyword', async () => {
    const result = await service.reply('theo dõi đơn hàng');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('đăng nhập');
  });

  it('returns canned return response for return keyword', async () => {
    const result = await service.reply('muốn đổi trả hàng');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('7 ngày');
  });

  it('returns canned shipping response for ship keyword', async () => {
    const result = await service.reply('vận chuyển mất bao lâu');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('vận chuyển');
  });

  it('returns canned payment response for payment keyword', async () => {
    const result = await service.reply('hỗ trợ thanh toán gì');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('COD');
  });

  it('returns canned contact response for contact keyword', async () => {
    const result = await service.reply('cần liên hệ hỗ trợ');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('yêu cầu hỗ trợ');
  });

  it('falls back to FAQ search when no keyword matches', async () => {
    faqRepo.search.mockResolvedValue([mockFaq]);
    const result = await service.reply('câu hỏi ngẫu nhiên');
    expect(faqRepo.search).toHaveBeenCalledWith('câu hỏi ngẫu nhiên');
    expect(result.type).toBe('faq');
    expect(result.data).toHaveLength(1);
  });

  it('returns default reply when no match at all', async () => {
    faqRepo.search.mockResolvedValue([]);
    const result = await service.reply('xyz không biết gì');
    expect(result.type).toBe('text');
    expect(result.reply).toContain('yêu cầu hỗ trợ');
  });
});
