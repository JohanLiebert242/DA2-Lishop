import { Injectable } from '@nestjs/common';
import { prisma, TicketCategory, TicketStatus } from '@lishop/database';

export interface TicketSummary {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: Date;
  _count: { messages: number };
}

export interface TicketMessageItem {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  content: string;
  createdAt: Date;
}

export interface TicketDetail {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; email: string; firstName: string; lastName: string };
  messages: TicketMessageItem[];
}

export interface AdminTicketItem {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: Date;
  user: { email: string; firstName: string; lastName: string };
  _count: { messages: number };
  messages: { content: string; createdAt: Date; isAdmin: boolean }[];
}

const TICKET_DETAIL_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  messages: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class SupportTicketsRepository {
  async create(
    userId: string,
    category: TicketCategory,
    subject: string,
    description: string,
    orderRef?: string,
  ): Promise<TicketDetail> {
    return prisma.$transaction(async (tx) => {
      const ticket = await tx.supportTicket.create({
        data: {
          userId,
          category,
          subject,
          status: TicketStatus.OPEN,
          orderRef: orderRef ?? null,
          messages: {
            create: { userId, isAdmin: false, content: description },
          },
        },
        include: TICKET_DETAIL_INCLUDE,
      });
      return ticket as TicketDetail;
    });
  }

  async findByUserId(userId: string): Promise<TicketSummary[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        category: true,
        subject: true,
        status: true,
        orderRef: true,
        createdAt: true,
        _count: { select: { messages: true } },
      },
    });
    return tickets as TicketSummary[];
  }

  async findById(id: string): Promise<TicketDetail | null> {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: TICKET_DETAIL_INCLUDE,
    });
    return ticket as TicketDetail | null;
  }

  async findAll(status?: TicketStatus): Promise<AdminTicketItem[]> {
    const tickets = await prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' as const },
          take: 1,
          select: { content: true, createdAt: true, isAdmin: true },
        },
      },
    });
    return tickets as AdminTicketItem[];
  }

  async updateStatus(id: string, status: TicketStatus): Promise<TicketDetail> {
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: TICKET_DETAIL_INCLUDE,
    });
    return ticket as TicketDetail;
  }

  async addMessage(
    ticketId: string,
    userId: string,
    content: string,
    isAdmin: boolean,
  ): Promise<TicketMessageItem> {
    return prisma.ticketMessage.create({
      data: { ticketId, userId, content, isAdmin },
    });
  }

  async hasAdminMessages(ticketId: string): Promise<boolean> {
    const count = await prisma.ticketMessage.count({
      where: { ticketId, isAdmin: true },
    });
    return count > 0;
  }
}
