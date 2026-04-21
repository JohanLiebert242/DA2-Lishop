import { Injectable } from '@nestjs/common';
import { prisma, FAQ, Prisma } from '@lishop/database';

@Injectable()
export class FaqRepository {
  findPublished(): Promise<FAQ[]> {
    return prisma.fAQ.findMany({
      where: { isPublished: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  search(q: string): Promise<FAQ[]> {
    return prisma.fAQ.findMany({
      where: {
        isPublished: true,
        question: { contains: q, mode: Prisma.QueryMode.insensitive },
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findAll(): Promise<FAQ[]> {
    return prisma.fAQ.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  create(data: {
    question: string;
    answer: string;
    category: string;
    sortOrder?: number;
    isPublished?: boolean;
  }): Promise<FAQ> {
    return prisma.fAQ.create({ data });
  }

  update(id: string, data: Prisma.FAQUpdateInput): Promise<FAQ> {
    return prisma.fAQ.update({ where: { id }, data });
  }

  delete(id: string): Promise<FAQ> {
    return prisma.fAQ.delete({ where: { id } });
  }

  findById(id: string): Promise<FAQ | null> {
    return prisma.fAQ.findUnique({ where: { id } });
  }
}
