import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrdersRepository, OrderWithDetails, ShipmentWithEvents } from './orders.repository';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../promotions/coupons.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ShippingService } from '../shipping/shipping.service';
import { WalletService } from '../wallet/wallet.service';
import { PlaceOrderDto } from './dto/place-order.dto';
import { OrderStatus, PaymentMethod, ShippingProvider } from '@lishop/database';

const CANCELLABLE_STATUSES: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.PROCESSING];

@Injectable()
export class OrdersService {
  constructor(
    private readonly repo: OrdersRepository,
    private readonly addressRepo: AddressesRepository,
    private readonly cartService: CartService,
    private readonly couponsService: CouponsService,
    private readonly notifRepo: NotificationsRepository,
    private readonly shippingService: ShippingService,
    private readonly walletService: WalletService,
  ) {}

  async placeOrder(userId: string, dto: PlaceOrderDto): Promise<OrderWithDetails> {
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng đang trống');
    }

    // Validate stock before entering transaction
    for (const item of cart.items) {
      if (item.stock < item.quantity) {
        throw new ConflictException(
          `Sản phẩm "${item.productName}" không đủ hàng trong kho (còn ${item.stock})`,
        );
      }
    }

    const address = await this.addressRepo.findById(dto.addressId);
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại');
    }

    const provider = dto.shippingProvider ?? ShippingProvider.GHN;
    const totalWeightGrams = cart.items.reduce(
      (sum, item) => sum + (item.weightGrams ?? 500) * item.quantity,
      0,
    );
    const shippingFeeVnd = this.shippingService.calculateFee(
      address.city,
      provider,
      totalWeightGrams,
    );

    const subtotalVnd = cart.subtotalVnd;
    // FREE_SHIPPING coupons waive the shipping fee; add it to the discount amount
    const discountVnd = cart.discountVnd + (cart.isFreeShipping ? shippingFeeVnd : 0);
    const totalVnd = Math.max(0, subtotalVnd + shippingFeeVnd - discountVnd);

    const order = await this.repo.create({
      userId,
      addressId: dto.addressId,
      shippingProvider: provider,
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

    // Deduct wallet if payment method is WALLET
    if (dto.paymentMethod === PaymentMethod.WALLET) {
      await this.walletService.deductForOrder(userId, order.id, totalVnd);
    }

    // Record coupon usage so it cannot be reused
    if (cart.couponCode) {
      await this.couponsService.recordUsage(cart.couponCode, userId);
    }

    await this.cartService.clearCart(userId);
    this.notifRepo
      .createNotification(
        userId,
        'Đơn hàng đã đặt thành công',
        `Đơn hàng #${order.orderNumber} đang chờ xác nhận.`,
        'ORDER_STATUS',
        order.id,
      )
      .catch((err: unknown) =>
        console.error('[OrdersService] Failed to create place-order notification', err),
      );

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

  async getTracking(userId: string, orderId: string): Promise<{ shipment: ShipmentWithEvents | null }> {
    const shipment = await this.repo.findShipmentByOrderId(orderId, userId);
    if (shipment === null) {
      // Distinguish: order not found vs. order has no shipment yet
      const order = await this.repo.findByIdAndUserId(orderId, userId);
      if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    }
    return { shipment };
  }

  async cancelOrder(userId: string, orderId: string): Promise<OrderWithDetails> {
    const order = await this.repo.findByIdAndUserId(orderId, userId);
    if (!order) throw new NotFoundException('Đơn hàng không tồn tại');
    if (!CANCELLABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Đơn hàng không thể hủy ở trạng thái hiện tại');
    }
    const cancelled = await this.repo.cancelOrder(orderId);
    this.notifRepo
      .createNotification(
        userId,
        'Đơn hàng đã được hủy',
        `Đơn hàng #${order.orderNumber} đã được hủy thành công.`,
        'ORDER_STATUS',
        orderId,
      )
      .catch((err: unknown) =>
        console.error('[OrdersService] Failed to create cancel-order notification', err),
      );
    return cancelled;
  }
}
