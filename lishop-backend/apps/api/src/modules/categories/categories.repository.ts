import { Injectable } from '@nestjs/common';
import { prisma, Category, Prisma } from '@lishop/database';

@Injectable()
export class CategoriesRepository {
  findAll(): Promise<Category[]> {
    return prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findBySlug(slug: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { slug } });
  }

  findById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return prisma.category.delete({ where: { id } });
  }
}
