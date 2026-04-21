import { Injectable, NotFoundException } from '@nestjs/common';
import { FAQ } from '@lishop/database';
import { FaqRepository } from './faq.repository';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

export interface FaqGroup {
  category: string;
  items: FAQ[];
}

@Injectable()
export class FaqService {
  constructor(private readonly repo: FaqRepository) {}

  async getPublished(): Promise<FaqGroup[]> {
    const faqs = await this.repo.findPublished();
    return this.groupByCategory(faqs);
  }

  search(q: string): Promise<FAQ[]> {
    return this.repo.search(q);
  }

  findAll(): Promise<FAQ[]> {
    return this.repo.findAll();
  }

  create(dto: CreateFaqDto): Promise<FAQ> {
    return this.repo.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
    });
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FAQ> {
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ không tồn tại');
    return this.repo.update(id, dto);
  }

  async delete(id: string): Promise<FAQ> {
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ không tồn tại');
    return this.repo.delete(id);
  }

  private groupByCategory(faqs: FAQ[]): FaqGroup[] {
    const map = new Map<string, FAQ[]>();
    for (const faq of faqs) {
      const group = map.get(faq.category) ?? [];
      group.push(faq);
      map.set(faq.category, group);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }
}
