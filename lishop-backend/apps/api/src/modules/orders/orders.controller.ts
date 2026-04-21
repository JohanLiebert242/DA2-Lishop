import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order from cart' })
  async placeOrder(@CurrentUser('id') userId: string, @Body() dto: PlaceOrderDto) {
    return this.ordersService.placeOrder(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user orders' })
  async getMyOrders(@CurrentUser('id') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific order' })
  async getOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findMyOrder(userId, id);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get shipment tracking info for an order' })
  async getTracking(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.getTracking(userId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order (PENDING or PROCESSING only)' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelOrder(userId, id);
  }
}
