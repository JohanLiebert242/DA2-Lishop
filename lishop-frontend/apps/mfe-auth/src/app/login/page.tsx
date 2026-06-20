'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoginSchema } from '@lishop/contracts';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { authApi } from '../../lib/auth-api';
import { hasSessionCookie } from '@lishop/shared';
import { Button } from '@lishop/ui';
import { Input } from '@lishop/ui';
import { Label } from '@lishop/ui';
import { toast } from '@lishop/ui';

const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';
const ADMIN_URL = process.env['NEXT_PUBLIC_MFE_ADMIN_URL'] ?? 'http://localhost:3009';

type LoginForm = z.infer<typeof LoginSchema>;

function getPostLoginUrl(role?: string) {
  return role === 'ADMIN' ? `${ADMIN_URL}/admin` : SHELL_URL;
}

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!hasSessionCookie()) return;

    void authApi
      .me()
      .then((user) => window.location.replace(getPostLoginUrl(user.role)))
      .catch(() => window.location.replace(SHELL_URL));
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      await authApi.login(data);
      const user = await authApi.me();
      toast.success('Đăng nhập thành công');
      setSuccess(true);
      setTimeout(() => { window.location.href = getPostLoginUrl(user.role); }, 500);
    } catch (e) {
      const message = (e as Error).message;
      setServerError(message);
      toast.error(message || 'Đăng nhập thất bại');
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-warm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-brand">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold text-stone-900">Đăng nhập thành công!</p>
          <p className="text-sm text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-warm">
      <div
        className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)' }}
      >
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #c084fc, transparent)' }} />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <img src="/lishop-logo.png" alt="Lishop logo" className="h-14 w-14 object-contain" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Chào mừng trở lại</h2>
          <p className="mt-3 max-w-xs mx-auto leading-relaxed text-white/70">
            Đăng nhập để khám phá hàng nghìn sản phẩm chất lượng và ưu đãi hấp dẫn
          </p>
          <div className="mt-8 flex flex-col gap-2.5 text-sm text-white/80">
            {['Giao hàng siêu tốc 1-3 ngày', 'Tích điểm mỗi đơn hàng', 'Thanh toán bảo mật 100%'].map((t) => (
              <div key={t} className="flex items-center gap-2">{t}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-brand">
              <img src="/lishop-logo.png" alt="Lishop logo" className="h-8 w-8 object-contain" />
            </div>
            <span className="text-xl font-black text-stone-900">Lishop</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-stone-900">Đăng nhập</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-semibold text-primary transition-opacity hover:opacity-80">
              Đăng ký ngay
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                placeholder="ten@email.com"
                className={errors.email ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.email && <p className="text-xs font-medium text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
                <Link href="/forgot-password" className="text-xs font-semibold text-primary transition-opacity hover:opacity-80">
                  Quên mật khẩu?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                placeholder="••••••••"
                className={errors.password ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {errors.password && <p className="text-xs font-medium text-destructive">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
                <p className="text-sm font-medium text-destructive">{serverError}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2 h-auto w-full cursor-pointer py-3 text-base text-white">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Đang đăng nhập...
                </span>
              ) : 'Đăng nhập'}
            </Button>
          </form>

          <div className="relative mt-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-warm px-3 text-xs font-medium text-muted-foreground">Hoặc tiếp tục với</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {['Google', 'Facebook'].map((provider) => (
              <a
                key={provider}
                href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/${provider.toLowerCase()}/initiate`}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-300 hover:bg-stone-50"
              >
                {provider}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
