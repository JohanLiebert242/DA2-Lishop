import { Injectable } from '@nestjs/common';
import { prisma, User, Prisma } from '@lishop/database';

export interface LoyaltyPointItem {
  id: string;
  points: number;
  description: string;
  createdAt: Date;
}

@Injectable()
export class UsersRepository {
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { googleId } });
  }

  async findByFacebookId(facebookId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { facebookId } });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async getProfile(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        loyaltyPoints: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateProfile(id: string, data: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        loyaltyPoints: true,
        role: true,
        createdAt: true,
      },
    });
  }

  getLoyaltyHistory(userId: string): Promise<LoyaltyPointItem[]> {
    return prisma.loyaltyPoint.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, points: true, description: true, createdAt: true },
    }) as Promise<LoyaltyPointItem[]>;
  }
}
