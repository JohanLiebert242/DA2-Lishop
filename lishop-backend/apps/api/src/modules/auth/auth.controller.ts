import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { FacebookOAuthGuard } from './guards/facebook-oauth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

@ApiTags('auth')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const token = req.headers.authorization?.slice(7) ?? '';
    await this.authService.logout(token);
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  async refresh(@Req() req: FastifyRequest) {
    const refreshToken = (req as any).refreshToken as string;
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser('id') userId: string) {
    return this.authService.me(userId);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Verify email address with token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:3000';
    res.redirect(`${clientUrl}/?token=${accessToken}`);
  }

  @Public()
  @UseGuards(FacebookOAuthGuard)
  @Get('oauth/facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:3000';
    res.redirect(`${clientUrl}/?token=${accessToken}`);
  }
}
