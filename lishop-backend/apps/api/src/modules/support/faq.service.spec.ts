import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FaqService } from './faq.service';
import { FaqRepository } from './faq.repository';

const mockFaq: any = {
  id: 'faq1',
  question: 'Chính sách đổi trả?',
  answer: '7 ngày',
  category: 'RETURN',
  sortOrder: 0,
  isPublished: true,
};

describe('FaqService', () => {
  let service: FaqService;
  const repo = {
    findPublished: jest.fn(),
    search: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FaqService,
        { provide: FaqRepository, useValue: repo },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();
    service = module.get(FaqService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getPublished groups FAQs by category', async () => {
    const faqReturn = { ...mockFaq, category: 'RETURN' };
    const faqOrder = { ...mockFaq, id: 'faq2', category: 'ORDER' };
    repo.findPublished.mockResolvedValue([faqReturn, faqOrder]);

    const result = await service.getPublished();

    expect(result).toHaveLength(2);
    const categories = result.map((g) => g.category);
    expect(categories).toContain('RETURN');
    expect(categories).toContain('ORDER');
    expect(result.find((g) => g.category === 'RETURN')!.items).toHaveLength(1);
  });

  it('getPublished groups multiple FAQs in same category', async () => {
    repo.findPublished.mockResolvedValue([mockFaq, { ...mockFaq, id: 'faq2' }]);
    const result = await service.getPublished();
    expect(result).toHaveLength(1);
    expect(result[0]!.items).toHaveLength(2);
  });

  it('getPublished returns default FAQs when database has no published FAQ', async () => {
    repo.findPublished.mockResolvedValue([]);

    const result = await service.getPublished();
    const count = result.reduce((total, group) => total + group.items.length, 0);

    expect(count).toBeGreaterThanOrEqual(10);
    expect(result.some((group) => group.category === 'ORDER')).toBe(true);
  });

  it('search delegates to repo', async () => {
    repo.search.mockResolvedValue([mockFaq]);
    const result = await service.search('đổi trả');
    expect(repo.search).toHaveBeenCalledWith('đổi trả');
    expect(result).toHaveLength(1);
  });

  it('searches default FAQs when database search has no result', async () => {
    repo.search.mockResolvedValue([]);

    const result = await service.search('hoan tien');

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((faq) => faq.category === 'REFUND')).toBe(true);
  });

  it('findAll delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockFaq]);
    const result = await service.findAll();
    expect(result).toHaveLength(1);
  });

  it('create delegates to repo with defaults', async () => {
    repo.create.mockResolvedValue(mockFaq);
    await service.create({ question: 'Q?', answer: 'A', category: 'ORDER' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      question: 'Q?',
      answer: 'A',
      category: 'ORDER',
      sortOrder: 0,
      isPublished: true,
    }));
  });

  it('create uses provided sortOrder and isPublished', async () => {
    repo.create.mockResolvedValue(mockFaq);
    await service.create({ question: 'Q?', answer: 'A', category: 'ORDER', sortOrder: 5, isPublished: false });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 5, isPublished: false }));
  });

  it('update throws NotFoundException when FAQ not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('faq99', { answer: 'new' })).rejects.toThrow(NotFoundException);
  });

  it('update updates existing FAQ', async () => {
    repo.findById.mockResolvedValue(mockFaq);
    repo.update.mockResolvedValue({ ...mockFaq, answer: 'updated' });
    const result = await service.update('faq1', { answer: 'updated' });
    expect(repo.update).toHaveBeenCalledWith('faq1', { answer: 'updated' });
    expect(result.answer).toBe('updated');
  });

  it('delete throws NotFoundException when FAQ not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.delete('faq99')).rejects.toThrow(NotFoundException);
  });

  it('delete deletes existing FAQ', async () => {
    repo.findById.mockResolvedValue(mockFaq);
    repo.delete.mockResolvedValue(mockFaq);
    const result = await service.delete('faq1');
    expect(repo.delete).toHaveBeenCalledWith('faq1');
    expect(result.id).toBe('faq1');
  });
});
