'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../components/account-sidebar';
import {
  createTicket,
  getMyTickets,
  uploadSupportMedia,
  type CreateTicketDto,
  type TicketCategory,
  type TicketStatus,
  type TicketSummary,
} from '../../lib/support-api';

const MFE_PROFILE = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ORDER: 'Đơn hàng',
  PRODUCT: 'Sản phẩm',
  SHIPPING: 'Vận chuyển',
  PAYMENT: 'Thanh toán',
  RETURN: 'Đổi trả',
  OTHER: 'Khác',
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  OPEN: { label: 'Mới', className: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'Đang xử lý', className: 'bg-blue-100 text-blue-700' },
  RESOLVED: { label: 'Đã giải quyết', className: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: 'Đã đóng', className: 'bg-gray-100 text-gray-600' },
};

const EMPTY_FORM: CreateTicketDto = {
  category: 'ORDER',
  subject: '',
  description: '',
  orderRef: '',
};

type SupportUploadDraft = {
  id: string;
  file: File;
  previewUrl: string;
  uploadedUrl?: string;
};

export default function SupportPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateTicketDto>({ ...EMPTY_FORM });
  const [uploads, setUploads] = useState<SupportUploadDraft[]>([]);
  const [formError, setFormError] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: getMyTickets,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreateTicketDto) => createTicket(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
      setUploads([]);
      setFormError('');
    },
    onError: (err: Error) => {
      setFormError(err.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
    },
  });

  function handleOpenModal() {
    setForm({ ...EMPTY_FORM });
    uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    setUploads([]);
    setFormError('');
    setShowModal(true);
  }

  useEffect(() => {
    return () => {
      uploads.forEach((u) => URL.revokeObjectURL(u.previewUrl));
    };
  }, [uploads]);

  async function uploadAll(): Promise<string[]> {
    const urls: string[] = [];
    for (const item of uploads) {
      if (item.uploadedUrl) {
        urls.push(item.uploadedUrl);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Không đọc được ảnh'));
        reader.readAsDataURL(item.file);
      });
      const res = await uploadSupportMedia(dataUrl, item.file.name);
      const fullUrl = res.url.startsWith('http') ? res.url : `${API_URL}${res.url}`;
      urls.push(fullUrl);
      setUploads((current) =>
        current.map((u) => (u.id === item.id ? { ...u, uploadedUrl: fullUrl } : u)),
      );
    }
    return urls;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim()) {
      setFormError('Vui lòng nhập tiêu đề yêu cầu.');
      return;
    }
    if (!form.description.trim()) {
      setFormError('Vui lòng nhập mô tả vấn đề.');
      return;
    }
    setFormError('');

    const baseDto: CreateTicketDto = {
      category: form.category,
      subject: form.subject.trim(),
      description: form.description.trim(),
      ...(form.orderRef?.trim() ? { orderRef: form.orderRef.trim() } : {}),
    };

    if (uploads.length === 0) {
      createMutation.mutate(baseDto);
      return;
    }

    void uploadAll()
      .then((urls) => {
        const attachmentBlock =
          urls.length > 0 ? `\n\nẢnh đính kèm:\n${urls.map((u) => `- ${u}`).join('\n')}` : '';
        createMutation.mutate({
          ...baseDto,
          description: `${baseDto.description}${attachmentBlock}`.slice(0, 2000),
        });
      })
      .catch((err: unknown) => {
        setFormError(err instanceof Error ? err.message : 'Không thể upload ảnh.');
      });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="support" />

      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Yêu cầu hỗ trợ</h1>
            <p className="mt-0.5 text-sm text-gray-500">Theo dõi và quản lý các yêu cầu hỗ trợ của bạn</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/support/faq"
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              📖 FAQ
            </Link>
            <button
              data-testid="support-create-open"
              onClick={handleOpenModal}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              + Tạo yêu cầu mới
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-16 text-center">
            <p className="text-4xl">🎧</p>
            <p className="mt-3 font-semibold text-gray-700">Chưa có yêu cầu hỗ trợ nào</p>
            <p className="mt-1 text-sm text-gray-400">Tạo yêu cầu mới nếu bạn cần được hỗ trợ</p>
            <button
              data-testid="support-create-open"
              onClick={handleOpenModal}
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Tạo yêu cầu đầu tiên
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Tiêu đề</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Tin nhắn</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {tickets.map((ticket: TicketSummary) => {
                  const status = STATUS_CONFIG[ticket.status];
                  return (
                    <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                        {ticket.subject}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{CATEGORY_LABELS[ticket.category]}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{ticket._count.messages}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/support/${ticket.id}`}
                          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-bold text-gray-900">Tạo yêu cầu hỗ trợ mới</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              {formError && (
                <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
                  {formError}
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Danh mục <span className="text-red-500">*</span>
                </label>
                <select
                  data-testid="support-ticket-category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as TicketCategory }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(Object.keys(CATEGORY_LABELS) as TicketCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="support-ticket-subject"
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Mô tả ngắn gọn vấn đề của bạn"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  data-testid="support-ticket-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả vấn đề của bạn một cách chi tiết..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Ảnh đính kèm (tối đa 3)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 3);
                    setUploads((current) => {
                      current.forEach((u) => URL.revokeObjectURL(u.previewUrl));
                      return files.map((file) => ({
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        file,
                        previewUrl: URL.createObjectURL(file),
                      }));
                    });
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {uploads.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {uploads.map((u) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={u.id}
                        src={u.previewUrl}
                        alt={u.file.name}
                        className="aspect-square w-full rounded-xl object-cover ring-1 ring-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Mã đơn hàng (nếu có)</label>
                <input
                  data-testid="support-ticket-order-ref"
                  type="text"
                  value={form.orderRef ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, orderRef: e.target.value }))}
                  placeholder="Ví dụ: ORD-2024-001"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  data-testid="support-ticket-submit"
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

