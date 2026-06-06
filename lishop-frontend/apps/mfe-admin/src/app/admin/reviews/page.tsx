'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminReview, ReviewAiModerationResponse, ReviewStatus } from '../../../lib/admin-api';
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS } from '../_constants';

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
        <td className="px-4 py-3 text-sm text-gray-900 max-w-[140px] truncate">{review.product.name}</td>
        <td className="px-4 py-3 text-sm text-gray-700 max-w-[120px] truncate">{userName}</td>
        <td className="px-4 py-3 text-sm text-amber-500 tracking-tight">{stars}</td>
        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs">
          <p className="line-clamp-2">{review.content}</p>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[review.status]}`}>
            {REVIEW_STATUS_LABELS[review.status]}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(review.createdAt).toLocaleDateString('vi-VN')}
        </td>
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
            {review.status !== 'APPROVED' && (
              <button
                type="button"
                onClick={() => mutation.mutate('APPROVED')}
                disabled={mutation.isPending}
                className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
              >
                Duyet
              </button>
            )}
            {review.status !== 'REJECTED' && (
              <button
                type="button"
                onClick={() => mutation.mutate('REJECTED')}
                disabled={mutation.isPending}
                className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
              >
                Tu choi
              </button>
            )}
          </div>
        </td>
      </tr>
      {aiModeration && (
        <tr className="border-b bg-sky-50">
          <td colSpan={7} className="px-4 py-3">
            <div className="rounded-md border border-sky-200 bg-white p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800">
                  AI kiem duyet
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${REVIEW_STATUS_COLORS[aiModeration.suggestedStatus]}`}>
                  {REVIEW_STATUS_LABELS[aiModeration.suggestedStatus]}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                  Risk: {aiModeration.riskLevel}
                </span>
                {aiModeration.fallback && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    fallback
                  </span>
                )}
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
      )}
    </>
  );
}

export default function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter],
    queryFn: () => adminApi.getReviews(statusFilter || undefined),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
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
              statusFilter === value
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-100'
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
        {!isLoading && reviews.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Khong co danh gia nao.</p>
        )}
      </div>
    </div>
  );
}
