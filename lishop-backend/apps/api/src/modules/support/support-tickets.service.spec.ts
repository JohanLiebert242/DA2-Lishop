import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsRepository } from './support-tickets.repository';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { TicketStatus } from '@lishop/database';

jest.mock('@lishop/database', () => ({
  prisma: {
    user: { findMany: jest.fn() },
  },
  TicketStatus: {
    OPEN: 'OPEN',
    IN_PROGRESS: 'IN_PROGRESS',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
  },
}));

import { prisma } from '@lishop/database';

const mockTicket: any = {
  id: 'ticket1',
  userId: 'u1',
  category: 'ORDER',
  subject: 'Đơn hàng chưa nhận được',
  status: 'OPEN',
  messages: [],
  createdAt: new Date(),
};

const mockMessage: any = {
  id: 'msg1',
  ticketId: 'ticket1',
  userId: 'u1',
  content: 'Tôi cần hỗ trợ',
  isAdmin: false,
  createdAt: new Date(),
};

describe('SupportTicketsService', () => {
  let service: SupportTicketsService;
  const repo = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findById: jest.fn(),
    addMessage: jest.fn(),
    findAll: jest.fn(),
    updateStatus: jest.fn(),
    hasAdminMessages: jest.fn(),
  };
  const notifRepo = { createNotification: jest.fn() };

  beforeEach(async () => {
    notifRepo.createNotification.mockResolvedValue({});
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin1' }]);

    const module = await Test.createTestingModule({
      providers: [
        SupportTicketsService,
        { provide: SupportTicketsRepository, useValue: repo },
        { provide: NotificationsRepository, useValue: notifRepo },
      ],
    }).compile();
    service = module.get(SupportTicketsService);
  });

  afterEach(() => jest.resetAllMocks());

  it('createTicket creates ticket and notifies admins', async () => {
    repo.create.mockResolvedValue(mockTicket);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin1' }, { id: 'admin2' }]);

    const result = await service.createTicket('u1', {
      category: 'ORDER',
      subject: 'Đơn hàng chưa nhận được',
      description: 'Mô tả',
    });

    expect(repo.create).toHaveBeenCalledWith('u1', 'ORDER', 'Đơn hàng chưa nhận được', 'Mô tả', undefined);
    expect(result.id).toBe('ticket1');
  });

  it('createTicket does not throw when admin notification fails', async () => {
    repo.create.mockResolvedValue(mockTicket);
    notifRepo.createNotification.mockRejectedValue(new Error('notif error'));

    await expect(
      service.createTicket('u1', { category: 'ORDER', subject: 'S', description: 'D' }),
    ).resolves.not.toThrow();
  });

  it('getMyTickets delegates to repo', async () => {
    repo.findByUserId.mockResolvedValue([mockTicket]);
    const result = await service.getMyTickets('u1');
    expect(repo.findByUserId).toHaveBeenCalledWith('u1');
    expect(result).toHaveLength(1);
  });

  it('getMyTicket throws NotFoundException when ticket not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getMyTicket('u1', 'ticket99')).rejects.toThrow(NotFoundException);
  });

  it('getMyTicket throws ForbiddenException when ticket belongs to another user', async () => {
    repo.findById.mockResolvedValue({ ...mockTicket, userId: 'u2' });
    await expect(service.getMyTicket('u1', 'ticket1')).rejects.toThrow(ForbiddenException);
  });

  it('getMyTicket returns ticket for correct user', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    const result = await service.getMyTicket('u1', 'ticket1');
    expect(result.id).toBe('ticket1');
  });

  describe('addCustomerMessage', () => {
    it('throws NotFoundException when ticket not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.addCustomerMessage('u1', 'ticket99', { content: 'msg' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when wrong user', async () => {
      repo.findById.mockResolvedValue({ ...mockTicket, userId: 'u2' });
      await expect(
        service.addCustomerMessage('u1', 'ticket1', { content: 'msg' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('adds message and notifies admins', async () => {
      repo.findById.mockResolvedValue(mockTicket);
      repo.addMessage.mockResolvedValue(mockMessage);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'admin1' }]);

      const result = await service.addCustomerMessage('u1', 'ticket1', { content: 'need help' });

      expect(repo.addMessage).toHaveBeenCalledWith('ticket1', 'u1', 'need help', false);
      expect(result.content).toBe('Tôi cần hỗ trợ');
    });
  });

  it('getAllTickets delegates to repo', async () => {
    repo.findAll.mockResolvedValue([mockTicket]);
    const result = await service.getAllTickets();
    expect(repo.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(1);
  });

  it('getAllTickets passes status filter to repo', async () => {
    repo.findAll.mockResolvedValue([]);
    await service.getAllTickets(TicketStatus.OPEN);
    expect(repo.findAll).toHaveBeenCalledWith(TicketStatus.OPEN);
  });

  describe('updateTicketStatus', () => {
    it('throws NotFoundException when ticket not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.updateTicketStatus('ticket99', { status: TicketStatus.RESOLVED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('updates ticket status', async () => {
      repo.findById.mockResolvedValue(mockTicket);
      repo.updateStatus.mockResolvedValue({ ...mockTicket, status: 'RESOLVED' });
      const result = await service.updateTicketStatus('ticket1', { status: TicketStatus.RESOLVED });
      expect(repo.updateStatus).toHaveBeenCalledWith('ticket1', TicketStatus.RESOLVED);
      expect(result.status).toBe('RESOLVED');
    });
  });

  describe('addAdminMessage', () => {
    it('throws NotFoundException when ticket not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.addAdminMessage('admin1', 'ticket99', { content: 'reply' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('auto-transitions OPEN ticket to IN_PROGRESS on first admin reply', async () => {
      repo.findById.mockResolvedValue(mockTicket);
      repo.hasAdminMessages.mockResolvedValue(false);
      repo.updateStatus.mockResolvedValue({ ...mockTicket, status: 'IN_PROGRESS' });
      repo.addMessage.mockResolvedValue({ ...mockMessage, isAdmin: true });

      await service.addAdminMessage('admin1', 'ticket1', { content: 'reply' });

      expect(repo.updateStatus).toHaveBeenCalledWith('ticket1', TicketStatus.IN_PROGRESS);
    });

    it('does not change status when admin already replied', async () => {
      repo.findById.mockResolvedValue(mockTicket);
      repo.hasAdminMessages.mockResolvedValue(true);
      repo.addMessage.mockResolvedValue({ ...mockMessage, isAdmin: true });

      await service.addAdminMessage('admin1', 'ticket1', { content: 'follow up' });

      expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it('notifies customer on admin reply', async () => {
      repo.findById.mockResolvedValue(mockTicket);
      repo.hasAdminMessages.mockResolvedValue(true);
      repo.addMessage.mockResolvedValue({ ...mockMessage, isAdmin: true });

      await service.addAdminMessage('admin1', 'ticket1', { content: 'reply' });

      expect(notifRepo.createNotification).toHaveBeenCalledWith(
        'u1',
        expect.any(String),
        expect.any(String),
        'SUPPORT',
        'ticket1',
      );
    });
  });
});
