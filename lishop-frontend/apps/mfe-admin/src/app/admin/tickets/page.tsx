'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, AdminTicket, TicketStatus } from '../../../lib/admin-api';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  TICKET_CATEGORY_LABELS,
} from '../_constants';

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  const statusMutation = useMutation({
    mutationFn: (s: TicketStatus) => adminApi.updateTicketStatus(ticket.id, s),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });

  const replyMutation = useMutation({
    mutationFn: () => adminApi.addTicketMessage(ticket.id, replyText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setShowReply(false);
      setReplyText('');
    },
  });

  const lastMessage = ticket.messages[ticket.messages.length - 1];

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{ticket.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-sm text-gray-700">{ticket.user.email}</td>
        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ticket.subject}</td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}
        </td>
        <td className="px-4 py-3">
          <select
            value={status}
            onChange={(e) => {
              const s = e.target.value as TicketStatus;
              setStatus(s);
              statusMutation.mutate(s);
            }}
            disabled={statusMutation.isPending}
            className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${TICKET_STATUS_COLORS[status]}`}
          >
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{TICKET_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
        </td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShowReply((v) => !v)}
            className={`rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
              showReply
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Phản hồi
          </button>
        </td>
      </tr>
      {showReply && (
        <tr className="border-b bg-indigo-50">
          <td colSpan={7} className="px-4 py-3">
            {lastMessage && (
              <div className="mb-3 rounded-md border border-gray-200 bg-white p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Tin nhắn cuối ({lastMessage.isAdmin ? 'Admin' : 'Khách'}
                  {' · '}{new Date(lastMessage.createdAt).toLocaleDateString('vi-VN')}):
                </p>
                <p className="text-sm text-gray-700 line-clamp-3">{lastMessage.content}</p>
              </div>
            )}
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Nhập phản hồi..."
              rows={3}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => replyMutation.mutate()}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {replyMutation.isPending ? 'Đang gửi...' : 'Gửi'}
              </button>
              <button
                type="button"
                onClick={() => { setShowReply(false); setReplyText(''); }}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: () => adminApi.getTickets(statusFilter || undefined),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <h2 className="mr-auto text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${tickets.length} yêu cầu hỗ trợ`}
        </h2>
        {[
          { label: 'Tất cả', value: '' },
          { label: 'Mở', value: 'OPEN' },
          { label: 'Đang xử lý', value: 'IN_PROGRESS' },
          { label: 'Đã giải quyết', value: 'RESOLVED' },
          { label: 'Đã đóng', value: 'CLOSED' },
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
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Email khách</th>
              <th className="px-4 py-2 text-left">Chủ đề</th>
              <th className="px-4 py-2 text-left">Danh mục</th>
              <th className="px-4 py-2 text-left">Trạng thái</th>
              <th className="px-4 py-2 text-left">Ngày tạo</th>
              <th className="px-4 py-2 text-left">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)}
          </tbody>
        </table>
        {!isLoading && tickets.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có yêu cầu hỗ trợ.</p>
        )}
      </div>
    </div>
  );
}
