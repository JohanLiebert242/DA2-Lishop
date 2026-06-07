'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { adminApi, AdminReview, ReviewAiModerationResponse, ReviewStatus } from '../../../lib/admin-api';
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS } from '../_constants';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

function ReviewRow({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient();
  const [aiModeration, setAiModeration] = useState<ReviewAiModerationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (status: ReviewStatus) => adminApi.moderateReview(review.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const aiMutation = useMutation({
    mutationFn: () => adminApi.generateReviewModeration(review.id),
    onSuccess: (result) => setAiModeration(result),
  });

  const stars = '*'.repeat(review.rating) + '-'.repeat(5 - review.rating);
  const userName =
    review.user.firstName && review.user.lastName
      ? `${review.user.firstName} ${review.user.lastName}`
      : review.user.email;

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="max-w-[140px] px-4 py-3 text-sm text-gray-900 truncate">{review.product.name}</td>
        <td className="max-w-[120px] px-4 py-3 text-sm text-gray-700 truncate">{userName}</td>
        <td className="px-4 py-3 text-sm tracking-tight text-amber-500">{stars}</td>
        <td className="max-w-xs px-4 py-3 text-sm text-gray-700">
          <p className="line-clamp-2">{review.content}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[review.status]}`}>
            {REVIEW_STATUS_LABELS[review.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString('vi-VN')}</td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => aiMutation.mutate()}
              disabled={aiMutation.isPending}
              className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-50"
            >
              {aiMutation.isPending ? 'AI dang kiem...' : 'AI kiem duyet'}
            </button>
            {review.status !== 'APPROVED' ? (
              <button
                type="button"
                onClick={() => mutation.mutate('APPROVED')}
                disabled={mutation.isPending}
                className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
              >
                Duyet
              </button>
            ) : null}
            {review.status !== 'REJECTED' ? (
              <button
                type="button"
                onClick={() => mutation.mutate('REJECTED')}
                disabled={mutation.isPending}
                className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
              >
                Tu choi
              </button>
            ) : null}
          </div>
        </td>
      </tr>
      {aiModeration ? (
        <tr className="border-b bg-sky-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="rounded-md border border-sky-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">AI kiem duyet</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[aiModeration.suggestedStatus]}`}>
                  {REVIEW_STATUS_LABELS[aiModeration.suggestedStatus]}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  Risk: {aiModeration.riskLevel}
                </span>
                {aiModeration.fallback ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">fallback</span>
                ) : null}
              </div>
              <p className="text-sm text-gray-900">{aiModeration.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-600">
                {aiModeration.reasons.map((reason, index) => (
                  <li key={`${review.id}-ai-reason-${index}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter],
    queryFn: () => adminApi.getReviews(statusFilter || undefined),
  });

  const pendingReviews = reviews.filter((review) => review.status === 'PENDING').length;
  const rejectedReviews = reviews.filter((review) => review.status === 'REJECTED').length;
  const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Star}
        title="Danh gia"
        description="Theo doi review khach hang, muc do sao, trang thai kiem duyet va AI moderation de giu chat luong noi dung hien thi tren storefront."
        badge="Moderation"
        tone="amber"
        stats={[
          { label: 'Tong review', value: isLoading ? '...' : `${reviews.length}` },
          { label: 'Cho duyet', value: isLoading ? '...' : `${pendingReviews}` },
          { label: 'Tu choi', value: isLoading ? '...' : `${rejectedReviews}` },
          { label: 'Sao TB', value: isLoading ? '...' : averageRating.toFixed(1) },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={ShieldCheck} label="Cho moderation" value={isLoading ? '...' : `${pendingReviews}`} hint="Review can admin thao tac" tone="indigo" />
        <AdminMetricCard icon={AlertTriangle} label="Bi tu choi" value={isLoading ? '...' : `${rejectedReviews}`} hint="Noi dung can xem lai" tone="rose" />
        <AdminMetricCard icon={Sparkles} label="Sao trung binh" value={isLoading ? '...' : averageRating.toFixed(1)} hint="Cam nhan tong quan tu feedback" tone="amber" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          <h2 className="mr-auto text-sm font-semibold text-gray-900">
            {isLoading ? 'Dang tai...' : `${reviews.length} danh gia`}
          </h2>
          {[
            { label: 'Tat ca', value: '' },
            { label: 'Cho duyet', value: 'PENDING' },
            { label: 'Da duyet', value: 'APPROVED' },
            { label: 'Tu choi', value: 'REJECTED' },
          ].map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                statusFilter === value ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">San pham</th>
                <th className="px-4 py-2 text-left">Nguoi dung</th>
                <th className="px-4 py-2 text-left">Sao</th>
                <th className="px-4 py-2 text-left">Noi dung</th>
                <th className="px-4 py-2 text-left">Trang thai</th>
                <th className="px-4 py-2 text-left">Ngay</th>
                <th className="px-4 py-2 text-left">Thao tac</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => <ReviewRow key={review.id} review={review} />)}
            </tbody>
          </table>
          {!isLoading && reviews.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={Star}
                title="Khong co danh gia nao"
                description="Khi storefront bat dau nhan review, admin se thay moderation queue va AI goi y tai day."
                tone="amber"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
