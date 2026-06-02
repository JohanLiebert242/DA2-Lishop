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
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// httpOnly — JS cannot read the raw token value
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes, matches token TTL
};

// Plain cookie — only signals "logged in", contains no sensitive data
const SESSION_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000,
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
    res.setCookie('lishop_at', accessToken, ACCESS_COOKIE_OPTIONS);
    res.setCookie('lishop_session', '1', SESSION_COOKIE_OPTIONS);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: FastifyReply) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    res.setCookie('lishop_at', accessToken, ACCESS_COOKIE_OPTIONS);
    res.setCookie('lishop_session', '1', SESSION_COOKIE_OPTIONS);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke tokens' })
  async logout(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const cookies = req.cookies as Record<string, string>;
    const accessToken = req.headers.authorization?.slice(7) ?? cookies['lishop_at'] ?? '';
    const refreshToken = cookies['refresh_token'];
    await this.authService.logout(accessToken, refreshToken);
    res.clearCookie('lishop_at', { path: '/' });
    res.clearCookie('lishop_session', { path: '/' });
    res.clearCookie('refresh_token', { path: '/auth/refresh' });
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const refreshToken = (req as any).refreshToken as string;
    const { accessToken, refreshToken: newRefreshToken } = await this.authService.refresh(refreshToken);
    res.setCookie('lishop_at', accessToken, ACCESS_COOKIE_OPTIONS);
    res.setCookie('lishop_session', '1', SESSION_COOKIE_OPTIONS);
    res.setCookie('refresh_token', newRefreshToken, REFRESH_COOKIE_OPTIONS);
    return { accessToken };
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
  @Get('oauth/google/initiate')
  @ApiOperation({ summary: 'Start Google OAuth login' })
  googleInitiate(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const redirectUri = `${this.getApiOrigin(req)}/auth/oauth/google/callback`;
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env['GOOGLE_CLIENT_ID'] ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    res.redirect(url.toString());
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('oauth/google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('lishop_at', accessToken, ACCESS_COOKIE_OPTIONS);
    res.setCookie('lishop_session', '1', SESSION_COOKIE_OPTIONS);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    // Token is in the httpOnly cookie — no sensitive data in the redirect URL
    res.redirect(process.env['CLIENT_URL'] ?? 'http://localhost:3000');
  }

  @Public()
  @Get('oauth/facebook/initiate')
  @ApiOperation({ summary: 'Start Facebook OAuth login' })
  facebookInitiate(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const redirectUri = `${this.getApiOrigin(req)}/auth/oauth/facebook/callback`;
    const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    url.searchParams.set('client_id', process.env['FACEBOOK_CLIENT_ID'] ?? '');
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'email,public_profile');
    res.redirect(url.toString());
  }

  @Public()
  @UseGuards(FacebookOAuthGuard)
  @Get('oauth/facebook/callback')
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookCallback(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const oauthUser = (req as any).oauthUser;
    const { accessToken, refreshToken } = await this.authService.findOrCreateOAuthUser(oauthUser);
    res.setCookie('lishop_at', accessToken, ACCESS_COOKIE_OPTIONS);
    res.setCookie('lishop_session', '1', SESSION_COOKIE_OPTIONS);
    res.setCookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
    res.redirect(process.env['CLIENT_URL'] ?? 'http://localhost:3000');
  }

  private getApiOrigin(req: FastifyRequest): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwardedProto)
      ? forwardedProto[0]
      : forwardedProto ?? req.protocol ?? 'http';
    const host = req.headers['host'] ?? 'localhost:4000';
    return `${proto}://${host}`;
  }
}
