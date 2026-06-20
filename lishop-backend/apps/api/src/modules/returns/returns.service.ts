import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, OrderStatus, ReturnStatus, PaymentMethod, RefundMethod } from '@lishop/database';
import { ConfigService } from '@nestjs/config';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ReturnsRepository, ReturnRequestDetail } from './returns.repository';
import { RefundsService } from '../refunds/refunds.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto';

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly repo: ReturnsRepository,
    private readonly notifRepo: NotificationsRepository,
    private readonly refundsService: RefundsService,
    private readonly config: ConfigService,
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
    const created = await this.repo.create(userId, dto.orderId, dto.reason, dto.description, dto.items);
    void this.notifyAdmins(
      'Yeu cau doi tra moi',
      `Don hang ${order.id} vua co yeu cau doi tra moi.`,
      created.id,
    );
    return created;
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

    // Auto-create refund when return is completed
    if (dto.status === ReturnStatus.COMPLETED) {
      const order = await prisma.order.findUnique({
        where: { id: returnRequest.orderId },
        include: { payment: true },
      });
      if (order?.payment) {
        // Calculate refund based on returned items only, not the full order amount
        const returnedItemIds = returnRequest.items.map((i) => i.orderItemId);
        const orderItems = await prisma.orderItem.findMany({
          where: { id: { in: returnedItemIds }, orderId: returnRequest.orderId },
          select: { id: true, unitPriceVnd: true },
        });
        const priceMap = new Map(orderItems.map((i) => [i.id, i.unitPriceVnd]));
        const refundAmountVnd = returnRequest.items.reduce((sum, item) => {
          return sum + (priceMap.get(item.orderItemId) ?? 0) * item.quantity;
        }, 0);

        if (refundAmountVnd > 0) {
          const refundMethod = order.payment.method === PaymentMethod.WALLET
            ? RefundMethod.WALLET
            : RefundMethod.ORIGINAL_PAYMENT;
          await this.refundsService.createRefund(
            returnRequest.orderId,
            returnRequest.userId,
            refundAmountVnd,
            refundMethod,
            id,
            'Hoàn tiền tự động sau đổi trả',
          );
        }
      }
    }

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

  async generateAdminAssist(id: string): Promise<{
    suggestedStatus: ReturnStatus;
    adminNote?: string;
    summary: string;
    reasons: string[];
    fallback: boolean;
  }> {
    const ret = await this.repo.findById(id);
    if (!ret) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u Ä‘á»•i tráº£');

    const next = this.getNextStatuses(ret.status);
    const fallbackSuggestion = this.buildReturnFallbackSuggestion(ret, next);

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return { ...fallbackSuggestion, fallback: true };

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
          instructions: this.buildReturnAssistPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Thong tin return request:',
                    JSON.stringify({ ...ret, nextStatuses: next }, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 700,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      const parsed = JSON.parse(text) as Partial<{
        suggestedStatus: ReturnStatus;
        adminNote: string;
        summary: string;
        reasons: string[];
      }>;

      const suggestedStatus = (parsed.suggestedStatus && next.includes(parsed.suggestedStatus))
        ? parsed.suggestedStatus
        : fallbackSuggestion.suggestedStatus;

      return {
        suggestedStatus,
        adminNote: parsed.adminNote?.toString().trim() || undefined,
        summary: parsed.summary?.toString().trim() || fallbackSuggestion.summary,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map((r) => String(r)).slice(0, 6) : fallbackSuggestion.reasons,
        fallback: false,
      };
    } catch (err) {
      console.error('[ReturnsService] AI return assist failed; returning fallback', err);
      return { ...fallbackSuggestion, fallback: true };
    }
  }

  private getNextStatuses(status: ReturnStatus): ReturnStatus[] {
    switch (status) {
      case ReturnStatus.PENDING:
        return [ReturnStatus.APPROVED, ReturnStatus.REJECTED];
      case ReturnStatus.APPROVED:
        return [ReturnStatus.RECEIVED, ReturnStatus.REJECTED];
      case ReturnStatus.RECEIVED:
        return [ReturnStatus.COMPLETED];
      default:
        return [];
    }
  }

  private buildReturnAssistPrompt(): string {
    return [
      'Ban la tro ly AI cho admin Lishop xu ly doi tra (returns).',
      'Hay dua ra goi y trang thai tiep theo va ghi chu ngan cho admin.',
      'Chi duoc chon suggestedStatus trong danh sach nextStatuses duoc cung cap.',
      'Tra ve DUY NHAT JSON object theo schema:',
      '{"suggestedStatus":"APPROVED|REJECTED|RECEIVED|COMPLETED","adminNote":"...","summary":"...","reasons":["..."]}',
      'adminNote viet tieng Viet, 1-2 cau, khong markdown, khong emoji.',
    ].join('\n');
  }

  private buildReturnFallbackSuggestion(ret: ReturnRequestDetail, nextStatuses: ReturnStatus[]) {
    const baseReasons = [
      `Ly do: ${ret.reason}`,
      ret.description ? `Mo ta: ${ret.description}` : 'Khong co mo ta chi tiet',
    ];

    const suggestedStatus = nextStatuses[0] ?? ret.status;

    const noteByStatus: Partial<Record<ReturnStatus, string>> = {
      [ReturnStatus.APPROVED]: 'Chap nhan doi tra. Huong dan khach dong goi va gui hang ve kho.',
      [ReturnStatus.REJECTED]: 'Tu choi doi tra do khong du dieu kien. Vui long ghi ro ly do neu can.',
      [ReturnStatus.RECEIVED]: 'Da nhan hang tra. Dang kiem tra va xu ly hoan tien.',
      [ReturnStatus.COMPLETED]: 'Hoan tat doi tra va hoan tien theo chinh sach.',
    };

    return {
      suggestedStatus,
      adminNote: noteByStatus[suggestedStatus] ?? undefined,
      summary: `De xuat: ${suggestedStatus}`,
      reasons: baseReasons,
    };
  }

  private extractOutputText(payload: { output_text?: string; output?: unknown }): string {
    if (typeof payload.output_text === 'string') return payload.output_text;
    if (!Array.isArray(payload.output)) return '';

    const parts: string[] = [];
    for (const item of payload.output) {
      if (!item || typeof item !== 'object') continue;
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const contentItem of content) {
        if (!contentItem || typeof contentItem !== 'object') continue;
        const text = (contentItem as { text?: unknown }).text;
        if (typeof text === 'string') parts.push(text);
      }
    }
    return parts.join('\n');
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

  private async notifyAdmins(title: string, body: string, relatedId: string): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifRepo.createNotification(admin.id, title, body, 'RETURN', relatedId),
      ),
    );
  }
}
