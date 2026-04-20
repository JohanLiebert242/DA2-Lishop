import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';

@Global()
@Module({
  imports: [UsersModule, MailModule],
  providers: [AuthService, JwtService, JwtAuthGuard, JwtRefreshGuard, GoogleOAuthGuard, FacebookOAuthGuard],
  controllers: [AuthController],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthModule {}
