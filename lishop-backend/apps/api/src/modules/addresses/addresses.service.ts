import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '@lishop/database';

@Injectable()
export class AddressesService {
  constructor(private readonly repo: AddressesRepository) {}

  getAddresses(userId: string): Promise<Address[]> {
    return this.repo.findByUserId(userId);
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    return this.repo.create({
      ...dto,
      user: { connect: { id: userId } },
    } as any);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<Address> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền sửa địa chỉ này');
    return this.repo.update(addressId, dto);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền xóa địa chỉ này');
    await this.repo.delete(addressId);
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    const existing = await this.repo.findById(addressId);
    if (!existing) throw new NotFoundException('Địa chỉ không tồn tại');
    if (existing.userId !== userId) throw new ForbiddenException('Không có quyền thay đổi địa chỉ này');
    await this.repo.setDefault(userId, addressId);
  }
}
