import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { ProductsRepository, ProductWithDetails } from './products.repository';
import { CategoriesService } from '../categories/categories.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async findMany(query: ProductListQueryDto): Promise<{ items: ProductWithDetails[]; nextCursor: string | null }> {
    return this.repo.findMany(query);
  }

  async findBySlug(slug: string): Promise<ProductWithDetails> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    return product;
  }

  async findFeatured(limit = 8): Promise<ProductWithDetails[]> {
    return this.repo.findFeatured(limit);
  }

  async findRelated(slug: string, limit = 6): Promise<ProductWithDetails[]> {
    const product = await this.repo.findBySlug(slug);
    if (!product) throw new NotFoundException(`Product not found: ${slug}`);
    const tagIds = product.tags.map((pt) => pt.tagId);
    return this.repo.findRelated(product.id, product.categoryId, tagIds, limit);
  }

  async create(dto: CreateProductDto): Promise<ProductWithDetails> {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const { images, tags, variants, categoryId, ...rest } = dto;
    const normalizedVariants = variants?.map((variant, index) => ({
      ...variant,
      weightGrams: variant.weightGrams ?? 500,
      isDefault: variants.some((v) => v.isDefault) ? !!variant.isDefault : index === 0,
      isActive: variant.isActive ?? true,
    }));

    return this.repo.create({
      ...rest,
      slug,
      category: { connect: { id: categoryId } },
      ...(images && {
        images: { create: images.map((img) => ({ url: img.url, alt: img.alt ?? null, isPrimary: img.isPrimary ?? false })) },
      }),
      ...(tags && {
        tags: {
          create: tags.map((tagName) => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName },
              },
            },
          })),
        },
      }),
      ...(normalizedVariants && {
        variants: { create: normalizedVariants },
      }),
    } as any);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductWithDetails> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);

    const updateData: any = { ...dto };
    delete updateData.images;
    delete updateData.tags;
    delete updateData.variants;
    delete updateData.categoryId;

    if (dto.name) updateData.slug = slugify(dto.name, { lower: true, strict: true });
    if (dto.categoryId) updateData.category = { connect: { id: dto.categoryId } };

    return this.repo.update(id, updateData);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Product not found: ${id}`);
    await this.repo.delete(id);
  }
}
