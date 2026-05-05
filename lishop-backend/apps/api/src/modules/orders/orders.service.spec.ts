import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { AddressesRepository } from '../addresses/addresses.repository';
import { CartService } from '../cart/cart.service';
import { CouponsService } from '../promotions/coupons.service';
import { NotificationsRepository } from '../notifications/notifications.repository';
import { ShippingService } from '../shipping/shipping.service';
import { WalletService } from '../wallet/wallet.service';
import { PaymentMethod, OrderStatus, ShippingProvider } from '@lishop/database';

const mockCart = {
  items: [
    {
      productId: 'p1',
      productName: 'iPhone 15',
      quantity: 2,
      priceVnd: 20000000,
      priceUsd: 800,
      stock: 5,
      weightGrams: 500,
      productSlug: 'iphone-15',
      id: 'ci1',
      imageUrl: null,
    },
  ],
  subtotalVnd: 40000000,
  subtotalUsd: 1600,
  couponCode: null,
  discountVnd: 0,
  isFreeShipping: false,
  totalVnd: 40000000,
};

const mockAddress = {
  id: 'addr1',
  userId: 'u1',
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  street: '123 Main',
  district: 'Q1',
  city: 'HCM',
  country: 'VN',
  isDefault: true,
  createdAt: new Date(),
};

const mockOrder = {
  id: 'order1',
  orderNumber: 'LS-123456',
  status: OrderStatus.PENDING,
  shippingProvider: ShippingProvider.GHN,
  subtotalVnd: 40000000,
  shippingFeeVnd: 30000,
  discountVnd: 0,
  totalVnd: 40030000,
  notes: null,
  trackingNumber: null,
  createdAt: new Date(),
  items: [],
  address: { fullName: 'A', phone: '09', street: 'B', district: 'C', city: 'D', country: 'VN' },
  payment: { id: 'pay1', method: 'COD', amountVnd: 40030000, status: 'PENDING' },
};

const defaultDto = {
  addressId: 'addr1',
  paymentMethod: PaymentMethod.COD,
  shippingProvider: ShippingProvider.GHN,
};

describe('OrdersService', () => {
  let service: OrdersService;
  const repo = {
    create: jest.fn(),
    findByUserId: jest.fn(),
    findByIdAndUserId: jest.fn(),
    cancelOrder: jest.fn(),
  };
  const addressRepo = { findById: jest.fn() };
  const cartService = { getCart: jest.fn(), clearCart: jest.fn() };
  const couponsService = { recordUsage: jest.fn() };
  const notifRepo = { createNotification: jest.fn() };
  const shippingService = { calculateFee: jest.fn().mockReturnValue(30000) };
  const walletService = { deductForOrder: jest.fn() };

  beforeEach(async () => {
    walletService.deductForOrder.mockResolvedValue(undefined);
    couponsService.recordUsage.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrdersRepository, useValue: repo },
        { provide: AddressesRepository, useValue: addressRepo },
        { provide: CartService, useValue: cartService },
        { provide: CouponsService, useValue: couponsService },
        { provide: NotificationsRepository, useValue: notifRepo },
        { provide: ShippingService, useValue: shippingService },
        { provide: WalletService, useValue: walletService },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  afterEach(() => jest.resetAllMocks());

  it('placeOrder throws BadRequestException when cart is empty', async () => {
    cartService.getCart.mockResolvedValue({ ...mockCart, items: [], subtotalVnd: 0, totalVnd: 0 });
    await expect(service.placeOrder('u1', defaultDto)).rejects.toThrow(BadRequestException);
  });

  it('placeOrder throws ConflictException when stock is insufficient', async () => {
    cartService.getCart.mockResolvedValue({
      ...mockCart,
      items: [{ ...mockCart.items[0], stock: 1, quantity: 3 }],
    });
    await expect(service.placeOrder('u1', defaultDto)).rejects.toThrow(ConflictException);
  });

  it('placeOrder throws NotFoundException when address not found', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue(null);
    await expect(service.placeOrder('u1', { ...defaultDto, addressId: 'addr99' })).rejects.toThrow(NotFoundException);
  });

  it('placeOrder throws NotFoundException when address belongs to another user', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue({ ...mockAddress, userId: 'u2' });
    await expect(service.placeOrder('u1', defaultDto)).rejects.toThrow(NotFoundException);
  });

  it('placeOrder creates order, clears cart, and creates notification', async () => {
    cartService.getCart.mockResolvedValue(mockCart);
    addressRepo.findById.mockResolvedValue(mockAddress);
    shippingService.calculateFee.mockReturnValue(30000);
    repo.create.mockResolvedValue(mockOrder);
    cartService.clearCart.mockResolvedValue(undefined);
    notifRepo.createNotification.mockResolvedValue({});

    const result = await service.placeOrder('u1', defaultDto);

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'u1',
      addressId: 'addr1',
      subtotalVnd: 40000000,
      shippingFeeVnd: 30000,
      discountVnd: 0,
      shippingProvider: ShippingProvider.GHN,
    }));
    expect(cartService.clearCart).toHaveBeenCalledWith('u1');
    expect(notifRepo.createNotification).toHaveBeenCalledWith(
      'u1',
      'Đơn hàng đã đặt thành công',
      `Đơn hàng #LS-123456 đang chờ xác nhận.`,
      'ORDER_STATUS',
      'order1',
    );
    expect(result.orderNumber).toBe('LS-123456');
  });

  it('findMyOrders returns orders for user', async () => {
    repo.findByUserId.mockResolvedValue([mockOrder]);
    const result = await service.findMyOrders('u1');
    expect(result).toHaveLength(1);
  });

  it('findMyOrder throws NotFoundException when order not found', async () => {
    repo.findByIdAndUserId.mockResolvedValue(null);
    await expect(service.findMyOrder('u1', 'order99')).rejects.toThrow(NotFoundException);
  });

  it('cancelOrder throws NotFoundException when order not found', async () => {
    repo.findByIdAndUserId.mockResolvedValue(null);
    await expect(service.cancelOrder('u1', 'order99')).rejects.toThrow(NotFoundException);
  });

  it('cancelOrder throws BadRequestException when order is not cancellable', async () => {
    repo.findByIdAndUserId.mockResolvedValue({ ...mockOrder, status: OrderStatus.SHIPPED });
    await expect(service.cancelOrder('u1', 'order1')).rejects.toThrow(BadRequestException);
  });

  it('cancelOrder cancels a PENDING order and creates notification', async () => {
    const pendingOrder = { ...mockOrder, status: OrderStatus.PENDING };
    const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };
    repo.findByIdAndUserId.mockResolvedValue(pendingOrder);
    repo.cancelOrder.mockResolvedValue(cancelledOrder);
    notifRepo.createNotification.mockResolvedValue({});

    const result = await service.cancelOrder('u1', 'order1');

    expect(repo.cancelOrder).toHaveBeenCalledWith('order1');
    expect(notifRepo.createNotification).toHaveBeenCalledWith(
      'u1',
      'Đơn hàng đã được hủy',
      `Đơn hàng #LS-123456 đã được hủy thành công.`,
      'ORDER_STATUS',
      'order1',
    );
    expect(result.status).toBe(OrderStatus.CANCELLED);
  });
});
