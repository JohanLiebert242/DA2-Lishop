import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CouponType, Prisma } from '@lishop/database';
import { CartRepository } from './cart.repository';
import { CouponsService } from '../promotions/coupons.service';
import { RedisService } from '../redis/redis.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

type ProductStockInfo = NonNullable<Awaited<ReturnType<CartRepository['findProduct']>>>;
type ProductVariantInfo = ProductStockInfo['variants'][number];

export interface CartItemDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  variantId: string | null;
  variantName: string | null;
  variantSku: string | null;
  variantAttributes: Prisma.JsonValue | null;
  quantity: number;
  priceVnd: number;
  priceUsd: number;
  stock: number;
  weightGrams: number;
}

export interface CartDto {
  items: CartItemDto[];
  subtotalVnd: number;
  subtotalUsd: number;
  couponCode: string | null;
  discountVnd: number;
  isFreeShipping: boolean;
  totalVnd: number;
}

@Injectable()
export class CartService {
  constructor(
    private readonly repo: CartRepository,
    private readonly couponsService: CouponsService,
    private readonly redis: RedisService,
  ) {}

  async getCart(userId: string): Promise<CartDto> {
    return this.buildCart(userId);
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartDto> {
    const product = await this.getProductOrThrow(dto.productId);
    const variant = this.resolveVariant(product, dto.variantId);
    const stock = variant?.stock ?? product.stock;
    if (stock < dto.quantity) {
      throw new BadRequestException(`Only ${stock} item(s) left in stock`);
    }
    await this.repo.addOrUpdate(userId, dto.productId, variant?.id ?? null, dto.quantity);
    return this.buildCart(userId);
  }

  async updateItem(userId: string, productId: string, dto: UpdateCartItemDto): Promise<CartDto> {
    const product = await this.getProductOrThrow(productId);
    const variant = this.resolveVariant(product, dto.variantId);
    const stock = variant?.stock ?? product.stock;
    if (stock < dto.quantity) {
      throw new BadRequestException(`Only ${stock} item(s) left in stock`);
    }
    await this.repo.addOrUpdate(userId, productId, variant?.id ?? null, dto.quantity);
    return this.buildCart(userId);
  }

  async removeItem(userId: string, productId: string, variantId?: string): Promise<CartDto> {
    await this.repo.remove(userId, productId, variantId ?? null);
    return this.buildCart(userId);
  }

  async applyCoupon(userId: string, code: string): Promise<CartDto> {
    const items = await this.repo.findByUserId(userId);
    const subtotalVnd = items.reduce(
      (sum, item) => sum + (item.variant?.priceVnd ?? item.product.priceVnd) * item.quantity,
      0,
    );
    const result = await this.couponsService.tryValidate(code, userId, subtotalVnd);
    if (!result) throw new BadRequestException('Coupon is invalid or cannot be applied');
    await this.redis.setex(`cart:coupon:${userId}`, 86400, code);
    return this.buildCart(userId, code);
  }

  async removeCoupon(userId: string): Promise<CartDto> {
    await this.redis.del(`cart:coupon:${userId}`);
    return this.buildCart(userId);
  }

  async clearCart(userId: string): Promise<void> {
    await this.repo.clear(userId);
    await this.redis.del(`cart:coupon:${userId}`);
  }

  private async buildCart(userId: string, couponOverride?: string): Promise<CartDto> {
    const rows = await this.repo.findByUserId(userId);

    const items: CartItemDto[] = rows.map((row) => ({
      id: row.id,
      productId: row.productId,
      productName: row.product.name,
      productSlug: row.product.slug,
      imageUrl: row.variant?.imageUrl ?? row.product.images[0]?.url ?? null,
      variantId: row.variantId,
      variantName: row.variant?.name ?? null,
      variantSku: row.variant?.sku ?? null,
      variantAttributes: row.variant?.attributes ?? null,
      quantity: row.quantity,
      priceVnd: row.variant?.priceVnd ?? row.product.priceVnd,
      priceUsd: row.variant?.priceUsd ?? row.product.priceUsd,
      stock: row.variant?.stock ?? row.product.stock,
      weightGrams: row.variant?.weightGrams ?? row.product.weightGrams,
    }));

    const subtotalVnd = items.reduce((s, i) => s + i.priceVnd * i.quantity, 0);
    const subtotalUsd = items.reduce((s, i) => s + i.priceUsd * i.quantity, 0);

    const couponCode = couponOverride ?? (await this.redis.get(`cart:coupon:${userId}`));
    let discountVnd = 0;
    let isFreeShipping = false;
    let resolvedCouponCode: string | null = null;

    if (couponCode) {
      const result = await this.couponsService.tryValidate(couponCode, userId, subtotalVnd);
      if (result) {
        discountVnd = result.discountVnd;
        isFreeShipping = result.coupon.type === CouponType.FREE_SHIPPING;
        resolvedCouponCode = couponCode;
      } else {
        await this.redis.del(`cart:coupon:${userId}`);
      }
    }

    return {
      items,
      subtotalVnd,
      subtotalUsd,
      couponCode: resolvedCouponCode,
      discountVnd,
      isFreeShipping,
      totalVnd: Math.max(0, subtotalVnd - discountVnd),
    };
  }

  private async getProductOrThrow(productId: string): Promise<ProductStockInfo> {
    const product = await this.repo.findProduct(productId);
    if (!product) throw new NotFoundException('Product does not exist');
    return product;
  }

  private resolveVariant(product: ProductStockInfo, requestedVariantId?: string): ProductVariantInfo | null {
    const variants = product.variants ?? [];
    if (variants.length === 0) {
      if (requestedVariantId) throw new BadRequestException('Product has no variants');
      return null;
    }

    const variant = requestedVariantId
      ? variants.find((item) => item.id === requestedVariantId)
      : variants.find((item) => item.isDefault) ?? variants[0];

    if (!variant) throw new BadRequestException('Product variant is invalid');
    if (variant.productId !== product.id) throw new BadRequestException('Product variant does not belong to product');
    if (!variant.isActive) throw new BadRequestException('Product variant is inactive');
    return variant;
  }
}
