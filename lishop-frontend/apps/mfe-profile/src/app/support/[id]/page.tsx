'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AccountSidebar } from '../../../components/account-sidebar';
import {
  getTicket,
  addMessage,
  type TicketStatus,
  type TicketCategory,
  type TicketMessage,
} from '../../../lib/support-api';

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ORDER: 'Đơn hàng',
  PRODUCT: 'Sản phẩm',
  SHIPPING: 'Vận chuyển',
  PAYMENT: 'Thanh toán',
  RETURN: 'Đổi trả',
  OTHER: 'Khác',
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; className: string }> = {
  OPEN:        { label: 'Mới',           className: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'Đang xử lý',   className: 'bg-blue-100 text-blue-700' },
  RESOLVED:    { label: 'Đã giải quyết', className: 'bg-emerald-100 text-emerald-700' },
  CLOSED:      { label: 'Đã đóng',      className: 'bg-gray-100 text-gray-600' },
};

function extractImageUrls(text: string): string[] {
  const urls = (text.match(/https?:\/\/[^\s)]+/g) ?? []).filter(Boolean);
  return urls.filter((u) => /\.(png|jpe?g|webp)(\?|#|$)/i.test(u));
}

export default function TicketDetailPage() {
  const params = useParams();
  const id = params['id'] as string;
  const queryClient = useQueryClient();
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const threadEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading, isError } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getTicket(id),
    enabled: !!id,
  });

  const replyMutation = useMutation({
    mutationFn: (content: string) => addMessage(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setReplyText('');
      setReplyError('');
    },
    onError: (err: Error) => {
      setReplyError(err.message ?? 'Không thể gửi tin nhắn, vui lòng thử lại.');
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (ticket?.messages) {
      threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticket?.messages]);

  function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim()) {
      setReplyError('Vui lòng nhập nội dung tin nhắn.');
      return;
    }
    setReplyError('');
    replyMutation.mutate(replyText.trim());
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 gap-6 px-4 py-8">
      <AccountSidebar activeSection="support" />

      <div className="flex-1 min-w-0">
        {/* Back link */}
        <Link
          href="/support"
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
        >
          ← Quay lại
        </Link>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : isError || !ticket ? (
          <div className="mt-4 rounded-2xl border border-gray-100 bg-white py-16 text-center">
            <p className="text-4xl">⚠️</p>
            <p className="mt-3 font-semibold text-gray-700">Không tìm thấy yêu cầu</p>
            <p className="mt-1 text-sm text-gray-400">
              Yêu cầu hỗ trợ không tồn tại hoặc bạn không có quyền xem.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Quay lại danh sách
            </Link>
          </div>
        ) : (
          <>
            {/* Ticket header card */}
            <div className="mt-2 rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 break-words">{ticket.subject}</h1>
                  <p className="mt-1 text-xs text-gray-400">
                    Tạo lúc {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                    {CATEGORY_LABELS[ticket.category]}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[ticket.status].className}`}>
                    {STATUS_CONFIG[ticket.status].label}
                  </span>
                </div>
              </div>
              {ticket.orderRef && (
                <p className="mt-2 text-xs text-gray-500">
                  Mã đơn hàng: <span className="font-semibold text-gray-700">{ticket.orderRef}</span>
                </p>
              )}
            </div>

            {/* Message thread */}
            <div className="mt-4 rounded-2xl border border-gray-100 bg-white">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h2 className="text-sm font-bold text-gray-900">
                  Lịch sử hội thoại ({ticket.messages.length} tin nhắn)
                </h2>
              </div>

              <div className="max-h-[480px] overflow-y-auto p-5 space-y-4">
                {ticket.messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    Chưa có tin nhắn nào. Hãy mô tả vấn đề của bạn bên dưới.
                  </p>
                ) : (
                  ticket.messages.map((msg: TicketMessage) => {
                    const imageUrls = extractImageUrls(msg.content ?? '');
                    if (msg.isAdmin) {
                      return (
                        <div key={msg.id} className="flex gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
                            🎧
                          </div>
                          <div className="max-w-[75%]">
                            <p className="mb-1 text-xs font-semibold text-indigo-600">Hỗ trợ viên</p>
                            <div className="rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3">
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                              {imageUrls.length > 0 && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  {imageUrls.map((url) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={url}
                                      src={url}
                                      alt="Attachment"
                                      className="aspect-video w-full rounded-xl object-cover ring-1 ring-gray-200"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className="flex flex-row-reverse gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm text-white font-bold">
                          {(ticket.user.firstName?.[0] ?? ticket.user.email[0] ?? 'U').toUpperCase()}
                        </div>
                        <div className="max-w-[75%]">
                          <p className="mb-1 text-right text-xs font-semibold text-gray-600">Bạn</p>
                          <div className="rounded-2xl rounded-tr-sm bg-blue-50 px-4 py-3">
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">{msg.content}</p>
                            {imageUrls.length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {imageUrls.map((url) => (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={url}
                                    src={url}
                                    alt="Attachment"
                                    className="aspect-video w-full rounded-xl object-cover ring-1 ring-gray-200"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="mt-1 text-right text-xs text-gray-400">
                            {new Date(msg.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply box — hidden if CLOSED */}
              {ticket.status !== 'CLOSED' && (
                <form onSubmit={handleReply} className="border-t border-gray-100 p-5">
                  {replyError && (
                    <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
                      {replyError}
                    </p>
                  )}
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Nhập tin nhắn của bạn..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={replyMutation.isPending}
                      className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {replyMutation.isPending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                    </button>
                  </div>
                </form>
              )}

              {ticket.status === 'CLOSED' && (
                <div className="border-t border-gray-100 px-5 py-4 text-center">
                  <p className="text-sm text-gray-400">
                    Yêu cầu này đã đóng. Vui lòng tạo yêu cầu mới nếu bạn cần hỗ trợ thêm.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
