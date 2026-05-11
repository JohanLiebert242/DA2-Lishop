import { Test } from '@nestjs/testing';
import { ChatbotService } from './chatbot.service';
import { FaqRepository } from './faq.repository';
import { ProductsService } from '../products/products.service';

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

  beforeEach(async () => {
    productsService.findMany.mockResolvedValue({ items: [], nextCursor: null });
    faqRepo.search.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        ChatbotService,
        { provide: ProductsService, useValue: productsService },
        { provide: FaqRepository, useValue: faqRepo },
      ],
    }).compile();
    service = module.get(ChatbotService);
  });

  afterEach(() => jest.resetAllMocks());

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
