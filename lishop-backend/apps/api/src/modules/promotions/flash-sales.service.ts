import { Injectable, NotFoundException } from '@nestjs/common';
import { FlashSalesRepository, FlashSaleWithItems } from './flash-sales.repository';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

@Injectable()
export class FlashSalesService {
  constructor(private readonly repo: FlashSalesRepository) {}

  findActive(): Promise<FlashSaleWithItems[]> {
    return this.repo.findActive();
  }

  findAll(): Promise<FlashSaleWithItems[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateFlashSaleDto): Promise<FlashSaleWithItems> {
    return this.repo.create({
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      isActive: dto.isActive,
    });
  }

  async update(id: string, dto: UpdateFlashSaleDto): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Flash sale ${id} not found`);
    return this.repo.update(id, {
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      isActive: dto.isActive,
    });
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Flash sale ${id} not found`);
    return this.repo.delete(id);
  }

  async addItem(saleId: string, productId: string, discountPercent: number): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(saleId);
    if (!existing) throw new NotFoundException(`Flash sale ${saleId} not found`);
    return this.repo.addItem(saleId, productId, discountPercent);
  }

  async removeItem(saleId: string, itemId: string): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(saleId);
    if (!existing) throw new NotFoundException(`Flash sale ${saleId} not found`);
    return this.repo.removeItem(saleId, itemId);
  }
}
