'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '../../lib/auth-api';

const ResetSchema = z.object({
  password: z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(128),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Mật khẩu không khớp',
  path: ['confirm'],
});

type ResetForm = z.infer<typeof ResetSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(ResetSchema),
  });

  async function onSubmit(data: ResetForm) {
    setServerError(null);
    try {
      await authApi.resetPassword(token, data.password);
      setSuccess(true);
    } catch (e) {
      setServerError((e as Error).message);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Mật khẩu đã được đặt lại!</h1>
          <Link href="/login" className="mt-6 inline-block rounded-md bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              {...register('confirm')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.confirm && <p className="mt-1 text-xs text-red-600">{errors.confirm.message}</p>}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{serverError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}
