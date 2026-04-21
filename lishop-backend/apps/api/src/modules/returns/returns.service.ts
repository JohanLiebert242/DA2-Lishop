import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, OrderStatus, ReturnStatus } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ReturnsRepository, ReturnRequestDetail } from './returns.repository';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

@Injectable()
export class ReturnsService {
  constructor(
    private readonly repo: ReturnsRepository,
    private readonly notifRepo: NotificationsRepository,
  ) {}

  async createReturn(userId: string, dto: CreateReturnDto): Promise<ReturnRequestDetail> {
    // 1. Fetch order with shipment
    const order = await prisma.order.findFirst({
      where: { id: dto.orderId, userId },
      include: { shipment: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Chỉ có thể yêu cầu đổi trả đơn hàng đã giao thành công');
    }

    // 2. Check delivered within 7 days
    const deliveredAt = order.shipment?.deliveredAt ?? order.updatedAt;
    if (Date.now() - deliveredAt.getTime() > RETURN_WINDOW_MS) {
      throw new BadRequestException('Đã quá 7 ngày kể từ ngày nhận hàng');
    }

    // 3. Check no active return request
    const existing = await prisma.returnRequest.findFirst({
      where: {
        orderId: dto.orderId,
        status: { in: [ReturnStatus.PENDING, ReturnStatus.APPROVED] },
      },
    });

    if (existing) {
      throw new ConflictException('Đơn hàng này đã có yêu cầu đổi trả đang xử lý');
    }

    // 4. Validate each item
    for (const item of dto.items) {
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: item.orderItemId, orderId: dto.orderId },
      });

      if (!orderItem) {
        throw new BadRequestException(
          `Sản phẩm trong đơn hàng không hợp lệ: ${item.orderItemId}`,
        );
      }

      if (item.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Số lượng đổi trả (${item.quantity}) vượt quá số lượng đã mua (${orderItem.quantity}) cho sản phẩm ${orderItem.productName}`,
        );
      }
    }

    // 5. Create return request
    return this.repo.create(userId, dto.orderId, dto.reason, dto.description, dto.items);
  }

  async getMyReturns(userId: string): Promise<ReturnRequestDetail[]> {
    return this.repo.findByUserId(userId);
  }

  async getMyReturn(userId: string, id: string): Promise<ReturnRequestDetail> {
    const returnRequest = await this.repo.findById(id);

    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu đổi trả');
    }

    if (returnRequest.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập yêu cầu đổi trả này');
    }

    return returnRequest;
  }

  async getAllReturns(): Promise<ReturnRequestDetail[]> {
    return this.repo.findAll();
  }

  async updateReturnStatus(id: string, dto: UpdateReturnStatusDto): Promise<ReturnRequestDetail> {
    const returnRequest = await this.repo.findById(id);

    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu đổi trả');
    }

    const updated = await this.repo.updateStatus(id, dto.status, dto.adminNote);

    // Fire notification (fire-and-forget)
    const notifData = this.getNotificationData(dto.status, dto.adminNote);
    if (notifData) {
      this.notifRepo
        .createNotification(
          returnRequest.userId,
          notifData.title,
          notifData.body,
          'ORDER_STATUS',
          returnRequest.orderId,
        )
        .catch((err: unknown) =>
          console.error('[ReturnsService] notification failed', err),
        );
    }

    return updated;
  }

  private getNotificationData(
    status: ReturnStatus,
    adminNote?: string,
  ): { title: string; body: string } | null {
    switch (status) {
      case ReturnStatus.APPROVED:
        return {
          title: 'Yêu cầu đổi trả được chấp nhận',
          body: 'Vui lòng gửi hàng về địa chỉ kho của chúng tôi.',
        };
      case ReturnStatus.REJECTED:
        return {
          title: 'Yêu cầu đổi trả bị từ chối',
          body: `Lý do: ${adminNote ?? 'Không đủ điều kiện đổi trả'}`,
        };
      case ReturnStatus.RECEIVED:
        return {
          title: 'Chúng tôi đã nhận được hàng trả',
          body: 'Đơn hàng đang được xử lý hoàn tiền.',
        };
      case ReturnStatus.COMPLETED:
        return {
          title: 'Đổi trả hoàn tất',
          body: 'Đơn hàng đã được hoàn tiền thành công.',
        };
      default:
        return null;
    }
  }
}
