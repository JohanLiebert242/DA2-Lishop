import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopStatus, UserRole } from '@lishop/database';
import { prisma } from '@lishop/database';
import { ShopsRepository } from './shops.repository';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopListQueryDto } from './dto/shop-list-query.dto';

@Injectable()
export class ShopsService {
  constructor(
    private readonly repo: ShopsRepository,
    private readonly config: ConfigService,
  ) {}

  async register(userId: string, dto: CreateShopDto) {
    const existing = await this.repo.findByUserId(userId);
    if (existing) throw new ConflictException('Bạn đã có cửa hàng');

    const slug = this.generateSlug(dto.name);

    try {
      const shop = await this.repo.create({
        name: dto.name,
        slug,
        description: dto.description ?? null,
        phone: dto.phone ?? null,
        address: dto.address ?? null,
        logoUrl: dto.logoUrl ?? null,
        bannerUrl: dto.bannerUrl ?? null,
        user: { connect: { id: userId } },
      });

      // Auto-upgrade user to SELLER role
      await prisma.user.update({
        where: { id: userId },
        data: { role: UserRole.SELLER },
      });

      return shop;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new ConflictException('Tên cửa hàng đã tồn tại');
      }
      throw err;
    }
  }

  async getMyShop(userId: string) {
    const shop = await this.repo.findByUserId(userId);
    if (!shop) throw new NotFoundException('Bạn chưa có cửa hàng');
    return shop;
  }

  async getShopBySlug(slug: string) {
    const shop = await this.repo.findBySlug(slug);
    if (!shop || shop.status !== ShopStatus.APPROVED) {
      throw new NotFoundException('Cửa hàng không tồn tại');
    }
    return shop;
  }

  async updateShop(userId: string, dto: UpdateShopDto) {
    const shop = await this.repo.findByUserId(userId);
    if (!shop) throw new NotFoundException('Bạn chưa có cửa hàng');

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) updateData.bannerUrl = dto.bannerUrl;

    return this.repo.update(shop.id, updateData);
  }

  async findAll(query?: ShopListQueryDto) {
    return this.repo.findAll(query?.status as ShopStatus | undefined);
  }

  async approveShop(shopId: string, adminId: string) {
    const shop = await this.repo.findById(shopId);
    if (!shop) throw new NotFoundException('Cửa hàng không tồn tại');
    if (shop.status === ShopStatus.APPROVED) return shop; // idempotent

    return this.repo.update(shopId, {
      status: ShopStatus.APPROVED,
      approvedAt: new Date().toISOString(),
      approvedBy: { connect: { id: adminId } },
    });
  }

  async rejectShop(shopId: string, adminId: string, reason?: string) {
    const shop = await this.repo.findById(shopId);
    if (!shop) throw new NotFoundException('Cửa hàng không tồn tại');
    if (shop.status === ShopStatus.REJECTED) return shop; // idempotent

    return this.repo.update(shopId, {
      status: ShopStatus.REJECTED,
      rejectionReason: reason ?? null,
      approvedBy: { connect: { id: adminId } },
    });
  }

  private generateSlug(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) || 'shop';
  }
}
