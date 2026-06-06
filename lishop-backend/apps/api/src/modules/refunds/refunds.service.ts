import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RefundMethod, RefundStatus } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { WalletService } from '../wallet/wallet.service';
import { RefundData, RefundsRepository } from './refunds.repository';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

@Injectable()
export class RefundsService {
  constructor(
    private readonly repo: RefundsRepository,
    private readonly walletService: WalletService,
    private readonly notifRepo: NotificationsRepository,
    private readonly config: ConfigService,
  ) {}

  async getUserRefunds(userId: string): Promise<RefundData[]> {
    return this.repo.findByUserId(userId);
  }

  async getRefund(userId: string, id: string): Promise<RefundData> {
    const refund = await this.repo.findById(id);

    if (!refund) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    }

    if (refund.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập yêu cầu hoàn tiền này');
    }

    return refund;
  }

  async getAllRefunds(): Promise<RefundData[]> {
    return this.repo.findAll();
  }

  async createRefund(
    orderId: string,
    userId: string,
    amountVnd: number,
    method: string,
    returnId?: string,
    reason?: string,
  ): Promise<RefundData> {
    if (returnId) {
      const existing = await this.repo.findByReturnId(returnId);
      if (existing) return existing;
    }
    return this.repo.create({ orderId, returnId, userId, amountVnd, method, reason });
  }

  async processRefund(id: string, adminNote?: string): Promise<RefundData> {
    const refund = await this.repo.findById(id);

    if (!refund) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền');
    }

    let updated: RefundData;

    if (refund.method === RefundMethod.WALLET) {
      // Credit the wallet then mark completed
      await this.walletService.refundToWallet(refund.userId, refund.orderId, refund.amountVnd);
      updated = await this.repo.updateStatus(id, RefundStatus.COMPLETED, adminNote);

      // Notify user (fire-and-forget)
      this.notifRepo
        .createNotification(
          refund.userId,
          'Hoàn tiền thành công',
          `Số tiền ${refund.amountVnd.toLocaleString('vi-VN')}đ đã được hoàn vào ví của bạn.`,
          'ORDER_STATUS',
          refund.orderId,
        )
        .catch((err: unknown) =>
          console.error('[RefundsService] wallet refund notification failed', err),
        );
    } else {
      // ORIGINAL_PAYMENT or MANUAL — move to PROCESSING and await external step
      updated = await this.repo.updateStatus(id, RefundStatus.PROCESSING, adminNote);

      // Notify user (fire-and-forget)
      this.notifRepo
        .createNotification(
          refund.userId,
          'Hoàn tiền đang được xử lý',
          'Yêu cầu hoàn tiền của bạn đang được xử lý. Vui lòng chờ trong 3–5 ngày làm việc.',
          'ORDER_STATUS',
          refund.orderId,
        )
        .catch((err: unknown) =>
          console.error('[RefundsService] refund processing notification failed', err),
        );
    }

    return updated;
  }

  async generateAdminAssist(id: string): Promise<{
    shouldProcess: boolean;
    adminNote?: string;
    summary: string;
    reasons: string[];
    fallback: boolean;
  }> {
    const refund = await this.repo.findById(id);
    if (!refund) throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y yÃªu cáº§u hoÃ n tiá»n');

    const fallbackSuggestion = this.buildRefundFallbackSuggestion(refund);

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
          instructions: this.buildRefundAssistPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Thong tin refund request:',
                    JSON.stringify(refund, null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 600,
        }),
      });

      if (!response.ok) throw new Error(`OpenAI request failed with status ${response.status}`);
      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      if (!text) throw new Error('OpenAI response did not include text output');

      const parsed = JSON.parse(text) as Partial<{
        shouldProcess: boolean;
        adminNote: string;
        summary: string;
        reasons: string[];
      }>;

      return {
        shouldProcess: typeof parsed.shouldProcess === 'boolean' ? parsed.shouldProcess : fallbackSuggestion.shouldProcess,
        adminNote: parsed.adminNote?.toString().trim() || undefined,
        summary: parsed.summary?.toString().trim() || fallbackSuggestion.summary,
        reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map((r) => String(r)).slice(0, 6) : fallbackSuggestion.reasons,
        fallback: false,
      };
    } catch (err) {
      console.error('[RefundsService] AI refund assist failed; returning fallback', err);
      return { ...fallbackSuggestion, fallback: true };
    }
  }

  private buildRefundAssistPrompt(): string {
    return [
      'Ban la tro ly AI cho admin Lishop xu ly hoan tien (refunds).',
      'Hay dua ra goi y co nen xu ly ngay hay can cho/kiem tra them, kem ghi chu admin ngan gon.',
      'Tra ve DUY NHAT JSON object theo schema:',
      '{"shouldProcess":true,"adminNote":"...","summary":"...","reasons":["..."]}',
      'adminNote viet tieng Viet, 1-2 cau, khong markdown, khong emoji.',
    ].join('\n');
  }

  private buildRefundFallbackSuggestion(refund: RefundData) {
    const reasons = [
      `Method: ${refund.method}`,
      `Status: ${refund.status}`,
      `AmountVnd: ${refund.amountVnd}`,
      refund.returnId ? `ReturnId: ${refund.returnId}` : 'No returnId',
    ];

    const isPending = refund.status === RefundStatus.PENDING;
    const shouldProcess = isPending;
    const note = refund.method === RefundMethod.WALLET
      ? 'Neu hop le, xu ly hoan vao vi va cap nhat trang thai completed.'
      : 'Neu hop le, chuyen sang processing va theo doi doi soat/ket noi cong thanh toan.';

    return {
      shouldProcess,
      adminNote: note,
      summary: shouldProcess ? 'De xuat: xu ly refund' : 'De xuat: khong can xu ly ngay',
      reasons,
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
}
