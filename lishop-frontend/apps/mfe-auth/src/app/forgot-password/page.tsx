'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ForgotPasswordSchema } from '@lishop/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { authApi } from '../../lib/auth-api';
import { toast } from '@lishop/ui';

type ForgotForm = z.infer<typeof ForgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(ForgotPasswordSchema),
  });

  async function onSubmit(data: ForgotForm) {
    await authApi.forgotPassword(data.email).catch(() => {});
    toast.success('Nếu email tồn tại, hướng dẫn đặt lại mật khẩu đã được gửi');
    setSubmitted(true); // Always show success to avoid leaking emails
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Kiểm tra email của bạn</h1>
          <p className="mt-2 text-sm text-gray-500">
            Nếu email tồn tại trong hệ thống, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-indigo-600 hover:underline">
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
        <p className="mb-6 text-sm text-gray-500">Nhập email để nhận link đặt lại mật khẩu.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-indigo-600 hover:underline">Quay lại đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
