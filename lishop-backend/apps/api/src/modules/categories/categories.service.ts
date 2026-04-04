import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';

export interface CategoryTree {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  parentId: string | null;
  children?: CategoryTree[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  async findTree(): Promise<CategoryTree[]> {
    const all = await this.repo.findAll();
    return this.buildTree(all as CategoryTree[]);
  }

  async findBySlug(slug: string): Promise<CategoryTree> {
    const cat = await this.repo.findBySlug(slug);
    if (!cat) throw new NotFoundException(`Category not found: ${slug}`);
    return cat as CategoryTree;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryTree> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const cat = await this.repo.create({
      name: dto.name,
      slug,
      imageUrl: dto.imageUrl ?? null,
      ...(dto.parentId && { parent: { connect: { id: dto.parentId } } }),
    });
    return cat as CategoryTree;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Category not found: ${id}`);
    await this.repo.delete(id);
  }

  private buildTree(items: CategoryTree[], parentId: string | null = null): CategoryTree[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({ ...item, children: this.buildTree(items, item.id) }));
  }
}
