import { Injectable, NotFoundException } from '@nestjs/common';
import { FlashSalesRepository, FlashSaleWithItems } from './flash-sales.repository';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateFlashSaleDto } from './dto/create-flash-sale.dto';
import { UpdateFlashSaleDto } from './dto/update-flash-sale.dto';

@Injectable()
export class FlashSalesService {
  constructor(
    private readonly repo: FlashSalesRepository,
    private readonly realtime: RealtimeService,
  ) {}

  findActive(): Promise<FlashSaleWithItems[]> {
    return this.repo.findActive();
  }

  findAll(): Promise<FlashSaleWithItems[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateFlashSaleDto): Promise<FlashSaleWithItems> {
    const sale = await this.repo.create({
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
      isActive: dto.isActive,
    });

    this.realtime.emitFlashSaleUpdate(sale.id, {
      saleId: sale.id,
      isActive: sale.isActive,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        discountPercent: item.discountPercent,
      })),
      startAt: sale.startAt.toISOString(),
      endAt: sale.endAt.toISOString(),
    });

    return sale;
  }

  async update(id: string, dto: UpdateFlashSaleDto): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Flash sale ${id} not found`);
    const sale = await this.repo.update(id, {
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      isActive: dto.isActive,
    });

    this.realtime.emitFlashSaleUpdate(sale.id, {
      saleId: sale.id,
      isActive: sale.isActive,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        discountPercent: item.discountPercent,
      })),
      startAt: sale.startAt.toISOString(),
      endAt: sale.endAt.toISOString(),
    });

    return sale;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException(`Flash sale ${id} not found`);
    return this.repo.delete(id);
  }

  async addItem(saleId: string, productId: string, discountPercent: number): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(saleId);
    if (!existing) throw new NotFoundException(`Flash sale ${saleId} not found`);
    const sale = await this.repo.addItem(saleId, productId, discountPercent);

    this.realtime.emitFlashSaleUpdate(sale.id, {
      saleId: sale.id,
      isActive: sale.isActive,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        discountPercent: item.discountPercent,
      })),
      startAt: sale.startAt.toISOString(),
      endAt: sale.endAt.toISOString(),
    });

    return sale;
  }

  async removeItem(saleId: string, itemId: string): Promise<FlashSaleWithItems> {
    const existing = await this.repo.findById(saleId);
    if (!existing) throw new NotFoundException(`Flash sale ${saleId} not found`);
    const sale = await this.repo.removeItem(saleId, itemId);

    this.realtime.emitFlashSaleUpdate(sale.id, {
      saleId: sale.id,
      isActive: sale.isActive,
      items: sale.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        discountPercent: item.discountPercent,
      })),
      startAt: sale.startAt.toISOString(),
      endAt: sale.endAt.toISOString(),
    });

    return sale;
  }
}
