import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@lishop/database';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findByEmail(email);
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findById(id);
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.repo.findByGoogleId(googleId);
  }

  findByFacebookId(facebookId: string): Promise<User | null> {
    return this.repo.findByFacebookId(facebookId);
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.repo.create(data);
  }

  updateById(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.repo.updateById(id, data);
  }

  getProfile(userId: string) {
    return this.repo.getProfile(userId);
  }

  updateProfile(userId: string, dto: { firstName?: string; lastName?: string; avatarUrl?: string }) {
    return this.repo.updateProfile(userId, dto);
  }
}
