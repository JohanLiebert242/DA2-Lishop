import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@lishop/contracts';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopsService } from '../shops/shops.service';
import { OrdersService } from './orders.service';

@ApiTags('seller / orders')
@Controller('seller/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@ApiBearerAuth()
export class SellerOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly shopsService: ShopsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List orders containing my shop products' })
  async findMyShopOrders(@CurrentUser('id') userId: string) {
    const shop = await this.shopsService.getMyShop(userId);
    return this.ordersService.findByShopId(shop.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order detail (only items belonging to my shop)' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const shop = await this.shopsService.getMyShop(userId);
    return this.ordersService.findByShopIdAndOrderId(shop.id, id);
  }
}
