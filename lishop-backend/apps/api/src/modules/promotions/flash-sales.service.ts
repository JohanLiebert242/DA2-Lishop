import { Injectable } from '@nestjs/common';
import { FlashSalesRepository, FlashSaleWithItems } from './flash-sales.repository';

@Injectable()
export class FlashSalesService {
  constructor(private readonly repo: FlashSalesRepository) {}

  findActive(): Promise<FlashSaleWithItems[]> {
    return this.repo.findActive();
  }
}
