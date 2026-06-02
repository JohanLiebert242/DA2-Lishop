'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { authApi } from '../../lib/auth-api';
import { hasSessionCookie } from '@lishop/shared';
import { Button } from '@lishop/ui';
import { Input } from '@lishop/ui';
import { Label } from '@lishop/ui';

const SHELL_URL = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (hasSessionCookie()) window.location.replace(SHELL_URL);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      await authApi.login(data);
      setSuccess(true);
      const shellUrl = process.env['NEXT_PUBLIC_SHELL_URL'] ?? 'http://localhost:3010';
      setTimeout(() => { window.location.href = shellUrl; }, 500);
    } catch (e) {
      setServerError((e as Error).message);
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
          <p className="text-sm text-muted-foreground">Đang chuyển hướng về trang chủ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-warm">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-2/5 flex-col items-center justify-center p-12 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)' }}
      >
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }} />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #c084fc, transparent)' }} />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <span className="text-3xl font-black">Li</span>
          </div>
          <h2 className="text-3xl font-black tracking-tight">Chào mừng trở lại</h2>
          <p className="mt-3 text-white/70 leading-relaxed max-w-xs mx-auto">
            Đăng nhập để khám phá hàng nghìn sản phẩm chất lượng và ưu đãi hấp dẫn
          </p>
          <div className="mt-8 flex flex-col gap-2.5 text-sm text-white/80">
            {['🚚 Giao hàng siêu tốc 1–3 ngày', '🎁 Tích điểm mỗi đơn hàng', '🔒 Thanh toán bảo mật 100%'].map(t => (
              <div key={t} className="flex items-center gap-2">{t}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-brand">
              <span className="text-base font-black text-white">Li</span>
            </div>
            <span className="text-xl font-black text-stone-900">Lishop</span>
          </div>

          <h1 className="text-3xl font-black text-stone-900 tracking-tight">Đăng nhập</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link href="/register" className="font-semibold text-primary hover:opacity-80 transition-opacity">
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
                <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
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
              <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3.5">
                <svg className="h-4 w-4 text-destructive shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
                <p className="text-sm text-destructive font-medium">{serverError}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full py-3 text-white cursor-pointer text-base mt-2 h-auto">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
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
            {['Google', 'Facebook'].map(provider => (
              <a
                key={provider}
                href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/${provider.toLowerCase()}/initiate`}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm"
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
