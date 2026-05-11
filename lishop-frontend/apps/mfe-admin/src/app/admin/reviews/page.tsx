'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminReview, ReviewStatus } from '../../../lib/admin-api';
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS } from '../_constants';

function ReviewRow({ review }: { review: AdminReview }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (status: ReviewStatus) => adminApi.moderateReview(review.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] }),
  });

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const userName =
    review.user.firstName && review.user.lastName
      ? `${review.user.firstName} ${review.user.lastName}`
      : review.user.email;

  return (
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
        <div className="flex gap-1">
          {review.status !== 'APPROVED' && (
            <button
              type="button"
              onClick={() => mutation.mutate('APPROVED')}
              disabled={mutation.isPending}
              className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200 disabled:opacity-50"
            >
              Duyệt
            </button>
          )}
          {review.status !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => mutation.mutate('REJECTED')}
              disabled={mutation.isPending}
              className="rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
            >
              Từ chối
            </button>
          )}
        </div>
      </td>
    </tr>
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
          {isLoading ? 'Đang tải...' : `${reviews.length} đánh giá`}
        </h2>
        {[
          { label: 'Tất cả', value: '' },
          { label: 'Chờ duyệt', value: 'PENDING' },
          { label: 'Đã duyệt', value: 'APPROVED' },
          { label: 'Từ chối', value: 'REJECTED' },
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
              <th className="px-4 py-2 text-left">Sản phẩm</th>
              <th className="px-4 py-2 text-left">Người dùng</th>
              <th className="px-4 py-2 text-left">Sao</th>
              <th className="px-4 py-2 text-left">Nội dung</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Ngày</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((review) => <ReviewRow key={review.id} review={review} />)}
          </tbody>
        </table>
        {!isLoading && reviews.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Không có đánh giá nào.</p>
        )}
      </div>
    </div>
  );
}
