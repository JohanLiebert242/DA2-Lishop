import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@lishop/database';

const BCRYPT_ROUNDS = 12;
const EMAIL_VERIFY_TTL = 60 * 60 * 24; // 24 hours
const PASSWORD_RESET_TTL = 60 * 60; // 1 hour

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const verifyToken = randomBytes(32).toString('hex');
    await this.redisService.setex(`email_verify:${verifyToken}`, EMAIL_VERIFY_TTL, user.id);
    await this.mailService.sendVerificationEmail(user.email, verifyToken);

    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  async logout(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAccessToken(accessToken);
      if (payload.jti && payload.exp) {
        const ttl = this.jwtService.getRemainingTtl(payload.exp);
        if (ttl > 0) await this.redisService.setex(`blacklist:token:${payload.jti}`, ttl, '1');
      }
    } catch { /* Already invalid */ }

    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyRefreshToken(refreshToken);
        if (payload.jti && payload.exp) {
          const ttl = this.jwtService.getRemainingTtl(payload.exp);
          if (ttl > 0) await this.redisService.setex(`blacklist:refresh:${payload.jti}`, ttl, '1');
        }
      } catch { /* Already invalid */ }
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = await this.jwtService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reject if this refresh token was already rotated or revoked
    if (payload.jti) {
      const revoked = await this.redisService.get(`blacklist:refresh:${payload.jti}`);
      if (revoked) throw new UnauthorizedException('Refresh token has been revoked');
    }

    const user = await this.usersService.findById(payload.sub!);
    if (!user) throw new UnauthorizedException('User not found');

    // Blacklist the consumed refresh token (prevents replay)
    if (payload.jti && payload.exp) {
      const ttl = this.jwtService.getRemainingTtl(payload.exp);
      if (ttl > 0) await this.redisService.setex(`blacklist:refresh:${payload.jti}`, ttl, '1');
    }

    return this.issueTokens(user);
  }

  async me(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.redisService.get(`email_verify:${token}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired token');
    await this.usersService.updateById(userId, { emailVerified: true });
    await this.redisService.del(`email_verify:${token}`);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return; // Don't leak whether email exists
    const token = randomBytes(32).toString('hex');
    await this.redisService.setex(`pwd_reset:${token}`, PASSWORD_RESET_TTL, user.id);
    await this.mailService.sendPasswordResetEmail(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await this.redisService.get(`pwd_reset:${token}`);
    if (!userId) throw new UnauthorizedException('Invalid or expired token');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersService.updateById(userId, { passwordHash });
    await this.redisService.del(`pwd_reset:${token}`);
  }

  async findOrCreateOAuthUser(data: {
    provider: 'google' | 'facebook';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  }): Promise<AuthTokens> {
    const field = data.provider === 'google' ? 'googleId' : 'facebookId';
    const findMethod = data.provider === 'google'
      ? this.usersService.findByGoogleId.bind(this.usersService)
      : this.usersService.findByFacebookId.bind(this.usersService);

    let user = await findMethod(data.providerId);
    if (!user) {
      user = await this.usersService.findByEmail(data.email);
      if (user) {
        user = await this.usersService.updateById(user.id, {
          [field]: data.providerId,
          emailVerified: true,
          ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
        });
      } else {
        user = await this.usersService.create({
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
          emailVerified: true,
          [field]: data.providerId,
        });
      }
    }
    return this.issueTokens(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAccessToken({ sub: user.id, email: user.email, role: user.role }),
      this.jwtService.signRefreshToken(user.id),
    ]);
    return { accessToken, refreshToken };
  }
}
