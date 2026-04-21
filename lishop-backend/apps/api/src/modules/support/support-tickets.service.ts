import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, TicketStatus } from '@lishop/database';
import { NotificationsRepository } from '../notifications/notifications.repository';
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

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly repo: SupportTicketsRepository,
    private readonly notifRepo: NotificationsRepository,
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
    return message;
  }

  getAllTickets(status?: TicketStatus): Promise<AdminTicketItem[]> {
    return this.repo.findAll(status);
  }

  async updateTicketStatus(id: string, dto: UpdateTicketStatusDto): Promise<TicketDetail> {
    const ticket = await this.repo.findById(id);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');
    return this.repo.updateStatus(id, dto.status);
  }

  async addAdminMessage(
    adminId: string,
    ticketId: string,
    dto: AddMessageDto,
  ): Promise<TicketMessageItem> {
    const ticket = await this.repo.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket không tồn tại');

    const alreadyReplied = await this.repo.hasAdminMessages(ticketId);
    if (!alreadyReplied && ticket.status === TicketStatus.OPEN) {
      await this.repo.updateStatus(ticketId, TicketStatus.IN_PROGRESS);
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

    return message;
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
}
