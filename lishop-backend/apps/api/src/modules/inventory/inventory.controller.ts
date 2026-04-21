import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';

@ApiTags('admin')
@Controller('admin/inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List all products with stock levels' })
  getAll() {
    return this.inventoryService.getAll();
  }

  @Post(':productId/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Adjust product stock' })
  adjustStock(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(productId, dto.delta, dto.note);
  }

  @Get(':productId/movements')
  @ApiOperation({ summary: 'List stock movements for a product' })
  getMovements(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.inventoryService.getMovements(productId);
  }
}
