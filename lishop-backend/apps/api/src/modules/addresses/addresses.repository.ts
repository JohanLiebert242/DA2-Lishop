import { Injectable } from '@nestjs/common';
import { prisma, Address, Prisma } from '@lishop/database';

@Injectable()
export class AddressesRepository {
  findByUserId(userId: string): Promise<Address[]> {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  findById(id: string): Promise<Address | null> {
    return prisma.address.findUnique({ where: { id } });
  }

  create(data: Prisma.AddressCreateInput): Promise<Address> {
    return prisma.address.create({ data });
  }

  update(id: string, data: Prisma.AddressUpdateInput): Promise<Address> {
    return prisma.address.update({ where: { id }, data });
  }

  delete(id: string): Promise<Address> {
    return prisma.address.delete({ where: { id } });
  }

  async setDefault(userId: string, addressId: string): Promise<void> {
    await prisma.$transaction([
      prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
    ]);
  }
}
