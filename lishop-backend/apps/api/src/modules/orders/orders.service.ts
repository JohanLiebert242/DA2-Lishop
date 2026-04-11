import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrdersRepository, OrderWithDetails } from './orders.repository';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartService } from '../cart/cart.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrderStatus } from '@lishop/database';

const SHIPPING_FEE_VND = 30000;
const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PROCESSING];

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly cartService: CartService,
    private readonly notifRepo: NotificationsRepository,
  ) {}

  async placeOrder(userId: string, dto: PlaceOrderDto): Promise<OrderWithDetails> {
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    const address = await this.addressRepo.findById(dto.addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    const subtotalVnd = cart.subtotalVnd;
    const discountVnd = cart.discountVnd;
    const shippingFeeVnd = SHIPPING_FEE_VND;
    const totalVnd = subtotalVnd + shippingFeeVnd - discountVnd;

    const order = await this.repo.create({
      userId,
      addressId: dto.addressId,
      subtotalVnd,
      shippingFeeVnd,
      discountVnd,
      totalVnd,
      notes: dto.notes,
      paymentMethod: dto.paymentMethod,
      items: cart.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceVnd: item.priceVnd,
        totalPriceVnd: item.priceVnd * item.quantity,
      })),
    });

    await this.cartService.clearCart(userId);
    this.notifRepo.createNotification(
      userId,
      'Đơn hàng đã đặt thành công',
      `Đơn hàng #${order.orderNumber} đang chờ xác nhận.`,
      'ORDER_STATUS',
      order.id,
    ).catch((err: unknown) => console.error('[OrdersService] Failed to create place-order notification', err));

    return order;
  }

  findMyOrders(userId: string): Promise<OrderWithDetails[]> {
    return this.repo.findByUserId(userId);
  }

  async findMyOrder(userId: string, orderId: string): Promise<OrderWithDetails> {
    const order = await this.repo.findByIdAndUserId(orderId, userId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    return order;
  }

  async cancelOrder(userId: string, orderId: string): Promise<OrderWithDetails> {
    const order = await this.repo.findByIdAndUserId(orderId, userId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Đơn hàng không thể hủy ở trạng thái hiện tại');
    }
    const cancelled = await this.repo.cancelOrder(orderId);
    this.notifRepo.createNotification(
      userId,
      'Đơn hàng đã được hủy',
      `Đơn hàng #${order.orderNumber} đã được hủy thành công.`,
      'ORDER_STATUS',
      orderId,
    ).catch((err: unknown) => console.error('[OrdersService] Failed to create cancel-order notification', err));
    return cancelled;
  }
}
