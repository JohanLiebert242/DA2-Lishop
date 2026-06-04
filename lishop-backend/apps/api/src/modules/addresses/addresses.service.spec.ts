import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesRepository } from './addresses.repository';

const makeAddr = (overrides: Partial<any> = {}): any => ({
  id: 'a1',
  userId: 'u1',
  fullName: 'Nguyen Van A',
  phone: '0901234567',
  street: '123 Main St',
  district: 'District 1',
  city: 'Ho Chi Minh',
  country: 'VN',
  isDefault: false,
  createdAt: new Date(),
  ...overrides,
});

describe('AddressesService', () => {
  let service: AddressesService;
  const repo = {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    setDefault: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AddressesService, { provide: AddressesRepository, useValue: repo }],
    }).compile();
    service = module.get(AddressesService);
  });

  afterEach(() => jest.resetAllMocks());

  it('getAddresses returns addresses for user', async () => {
    repo.findByUserId.mockResolvedValue([makeAddr()]);
    const result = await service.getAddresses('u1');
    expect(result).toHaveLength(1);
  });

  it('createAddress creates with userId', async () => {
    repo.create.mockResolvedValue(makeAddr());
    await service.createAddress('u1', { fullName: 'A', phone: '0901234567', street: 'B', district: 'C', city: 'D' });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ user: { connect: { id: 'u1' } } }));
  });

  it('createAddress keeps map coordinates for future delivery routing', async () => {
    repo.create.mockResolvedValue(makeAddr({ latitude: 10.7769, longitude: 106.7009 }));
    await service.createAddress('u1', {
      fullName: 'A',
      phone: '0901234567',
      street: 'B',
      district: 'C',
      city: 'D',
      latitude: 10.7769,
      longitude: 106.7009,
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      latitude: 10.7769,
      longitude: 106.7009,
    }));
  });

  it('updateAddress throws NotFoundException when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.updateAddress('u1', 'a99', {})).rejects.toThrow(NotFoundException);
  });

  it('updateAddress throws ForbiddenException when address belongs to another user', async () => {
    repo.findById.mockResolvedValue(makeAddr({ userId: 'u2' }));
    await expect(service.updateAddress('u1', 'a1', {})).rejects.toThrow(ForbiddenException);
  });

  it('updateAddress keeps edited map coordinates', async () => {
    repo.findById.mockResolvedValue(makeAddr());
    repo.update.mockResolvedValue(makeAddr({ latitude: 10.7769, longitude: 106.7009 }));
    await service.updateAddress('u1', 'a1', { latitude: 10.7769, longitude: 106.7009 });
    expect(repo.update).toHaveBeenCalledWith('a1', expect.objectContaining({
      latitude: 10.7769,
      longitude: 106.7009,
    }));
  });

  it('deleteAddress throws NotFoundException when not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.deleteAddress('u1', 'a99')).rejects.toThrow(NotFoundException);
  });

  it('setDefault calls repo.setDefault', async () => {
    repo.findById.mockResolvedValue(makeAddr());
    repo.setDefault.mockResolvedValue(undefined);
    await service.setDefault('u1', 'a1');
    expect(repo.setDefault).toHaveBeenCalledWith('u1', 'a1');
  });
});
