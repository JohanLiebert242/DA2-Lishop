'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../lib/auth-api';

const LoginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type LoginForm = z.infer<typeof LoginSchema>;

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setServerError(null);
    try {
      const result = await authApi.login(data);
      // Store access token for shell to pick up via postMessage or localStorage flag
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lishop_at', result.accessToken);
        window.dispatchEvent(new CustomEvent('lishop:auth', { detail: { accessToken: result.accessToken } }));
      }
      setSuccess(true);
      setTimeout(() => { window.location.href = 'http://localhost:3000'; }, 500);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-green-600">Đăng nhập thành công! Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Đăng nhập</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <Link href="/forgot-password" className="hover:text-indigo-600">
            Quên mật khẩu?
          </Link>
          <Link href="/register" className="hover:text-indigo-600">
            Chưa có tài khoản? Đăng ký
          </Link>
        </div>

        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-2 text-gray-500">Hoặc đăng nhập với</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/google/callback`}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Google
          </a>
          <a
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000'}/auth/oauth/facebook/callback`}
            className="flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Facebook
          </a>
        </div>
      </div>
    </div>
  );
}
