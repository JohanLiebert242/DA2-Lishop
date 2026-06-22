import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prisma, TicketStatus } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { RealtimeService } from '../realtime/realtime.service';
import {
  AdminTicketItem,
  SupportTicketsRepository,
  TicketDetail,
  TicketMessageItem,
  TicketSummary,
} from './support-tickets.repository';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

export interface TicketAdminAssist {
  summary: string;
  suggestedCategory: string;
  suggestedStatus: TicketStatus;
  replyDraft: string;
  fallback: boolean;
}

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly repo: SupportTicketsRepository,
    private readonly notifRepo: NotificationsRepository,
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
  ) {}

  async createTicket(userId: string, dto: CreateTicketDto): Promise<TicketDetail> {
    const ticket = await this.repo.create(
      userId,
      dto.category,
      dto.subject,
      dto.description,
      dto.orderRef,
    );
    this.notifyAdmins(
      'Ticket mới từ khách hàng',
      `Yêu cầu hỗ trợ mới: "${dto.subject}"`,
      ticket.id,
    ).catch((err: unknown) =>
      console.error('[SupportTicketsService] admin notify failed', err),
    );

    this.realtime.emitAdminFeed({
      type: 'new_ticket',
      ticketId: ticket.id,
      subject: ticket.subject,
      customerName: `${ticket.user.firstName} ${ticket.user.lastName}`,
      timestamp: new Date().toISOString(),
    });

    return ticket;
  }

  getMyTickets(userId: string): Promise<TicketSummary[]> {
    return this.repo.findByUserId(userId);
  }

  async getMyTicket(userId: string, id: string): Promise<TicketDetail> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền xem ticket này');
    return ticket;
  }

  async addCustomerMessage(
    userId: string,
    ticketId: string,
    dto: AddMessageDto,
  ): Promise<TicketMessageItem> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    if (ticket.userId !== userId) throw new ForbiddenException('Bạn không có quyền trả lời ticket này');

    const message = await this.repo.addMessage(ticketId, userId, dto.content, false);
    this.notifyAdmins(
      'Khách hàng phản hồi ticket',
      `Ticket "${ticket.subject}" có phản hồi mới từ khách hàng.`,
      ticketId,
    ).catch((err: unknown) =>
      console.error('[SupportTicketsService] admin notify failed', err),
    );

    this.realtime.emitTicketMessage(ticketId, message);

    return message;
  }

  getAllTickets(status?: TicketStatus): Promise<AdminTicketItem[]> {
    return this.repo.findAll(status);
  }

  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto): Promise<TicketDetail> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    const updated = await this.repo.updateStatus(id, dto.status);
    this.notifRepo
      .createNotification(
        ticket.userId,
        'Trang thai ticket da duoc cap nhat',
        `Ticket "${ticket.subject}" da chuyen sang trang thai ${dto.status}.`,
        'SUPPORT',
        ticket.id,
      )
      .catch((err: unknown) =>
        console.error('[SupportTicketsService] customer status notification failed', err),
      );

    this.realtime.emitTicketStatusChange(ticket.id, ticket.userId, dto.status);

    return updated;
  }

  async addAdminMessage(
    adminId: string,
    ticketId: string,
    dto: AddMessageDto,
  ): Promise<TicketMessageItem> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const alreadyReplied = await this.repo.hasAdminMessages(ticketId);
    let statusChanged = false;
    if (!alreadyReplied && ticket.status === TicketStatus.OPEN) {
      await this.repo.updateStatus(ticketId, TicketStatus.IN_PROGRESS);
      statusChanged = true;
    }

    const message = await this.repo.addMessage(ticketId, adminId, dto.content, true);

    this.notifRepo
      .createNotification(
        ticket.userId,
        'Hỗ trợ viên đã phản hồi',
        `Ticket "${ticket.subject}" có phản hồi từ hỗ trợ viên.`,
        'SUPPORT',
        ticketId,
      )
      .catch((err: unknown) =>
        console.error('[SupportTicketsService] customer notify failed', err),
      );

    this.realtime.emitTicketMessage(ticketId, message);

    if (statusChanged) {
      this.realtime.emitTicketStatusChange(ticketId, ticket.userId, TicketStatus.IN_PROGRESS);
    }

    return message;
  }

  async generateAdminAssist(ticketId: string): Promise<TicketAdminAssist> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const apiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (!apiKey) return this.buildAssistFallback(ticket);

    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
          instructions: this.buildAssistPrompt(),
          input: [
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: [
                    'Du lieu ticket ho tro Lishop dang xu ly:',
                    JSON.stringify(this.toAssistContext(ticket), null, 2),
                  ].join('\n'),
                },
              ],
            },
          ],
          max_output_tokens: 650,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const payload = await response.json() as { output_text?: string; output?: unknown };
      const text = this.extractOutputText(payload).trim();
      const parsed = JSON.parse(text) as Partial<TicketAdminAssist>;

      if (!parsed.summary || !parsed.replyDraft) {
        throw new Error('OpenAI response missing summary or replyDraft');
      }

      return {
        summary: parsed.summary,
        suggestedCategory: parsed.suggestedCategory || ticket.category,
        suggestedStatus: (parsed.suggestedStatus as TicketStatus | undefined) || TicketStatus.IN_PROGRESS,
        replyDraft: parsed.replyDraft,
        fallback: false,
      };
    } catch (err) {
      console.error('[SupportTicketsService] AI ticket assist failed; returning fallback', err);
      return this.buildAssistFallback(ticket);
    }
  }

  private async notifyAdmins(title: string, body: string, relatedId: string): Promise<void> {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifRepo.createNotification(admin.id, title, body, 'SUPPORT', relatedId),
      ),
    );
  }

  private toAssistContext(ticket: TicketDetail) {
    return {
      id: ticket.id,
      category: ticket.category,
      subject: ticket.subject,
      status: ticket.status,
      orderRef: ticket.orderRef,
      customer: {
        email: ticket.user.email,
        firstName: ticket.user.firstName,
        lastName: ticket.user.lastName,
      },
      messages: ticket.messages.slice(-8).map((message) => ({
        isAdmin: message.isAdmin,
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  }

  private buildAssistPrompt(): string {
    return [
      'Ban la tro ly AI ho tro admin Lishop xu ly ticket khach hang.',
      'Hay chi tra ve JSON hop le voi cac field: summary, suggestedCategory, suggestedStatus, replyDraft.',
      'summary: mot cau ngan tom tat van de, viet tieng Viet co dau.',
      'suggestedCategory: ORDER, PRODUCT, SHIPPING, PAYMENT, RETURN hoac OTHER.',
      'suggestedStatus: OPEN, IN_PROGRESS, RESOLVED hoac CLOSED.',
      'replyDraft: ban nhap phan hoi lich su, ngan gon, viet tieng Viet co dau, de admin chinh sua va gui khach.',
      'Khong hua hoan tien, doi moi, ngay giao hang, uu dai, hay ngoai le chinh sach neu ticket khong co du lieu.',
      'Khong dung markdown va khong them giai thich ngoai JSON.',
    ].join('\n');
  }

  private buildAssistFallback(ticket: TicketDetail): TicketAdminAssist {
    const lastCustomerMessage =
      [...ticket.messages].reverse().find((message) => !message.isAdmin)?.content ?? ticket.subject;

    return {
      summary: `Ticket "${ticket.subject}" cần hỗ trợ về ${ticket.category}.`,
      suggestedCategory: ticket.category,
      suggestedStatus: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status,
      replyDraft: `Chào bạn, Lishop đã nhận được yêu cầu: "${lastCustomerMessage}". Bộ phận hỗ trợ sẽ kiểm tra thông tin liên quan và phản hồi bạn trong thời gian sớm nhất.`,
      fallback: true,
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
