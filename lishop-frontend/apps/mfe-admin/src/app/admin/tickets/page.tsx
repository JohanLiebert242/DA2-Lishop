'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Headset, MailPlus, Sparkles, Ticket } from 'lucide-react';
import { adminApi, AdminTicket, TicketAiAssistResponse, TicketStatus } from '../../../lib/admin-api';
import {
  TICKET_STATUS_COLORS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  TICKET_CATEGORY_LABELS,
} from '../_constants';
import { AdminEmptyState } from '../_components/admin-empty-state';
import { AdminMetricCard } from '../_components/admin-metric-card';
import { AdminPageHeader } from '../_components/admin-page-header';

function TicketRow({ ticket }: { ticket: AdminTicket }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [aiAssist, setAiAssist] = useState<TicketAiAssistResponse | null>(null);

  const statusMutation = useMutation({
    mutationFn: (nextStatus: TicketStatus) => adminApi.updateTicketStatus(ticket.id, nextStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-tickets'] }),
  });

  const replyMutation = useMutation({
    mutationFn: () => adminApi.addTicketMessage(ticket.id, replyText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      setShowReply(false);
      setReplyText('');
      setAiAssist(null);
    },
  });

  const assistMutation = useMutation({
    mutationFn: () => adminApi.generateTicketAssist(ticket.id),
    onSuccess: (result) => {
      setAiAssist(result);
      setReplyText(result.replyDraft);
    },
  });

  const lastMessage = ticket.messages[ticket.messages.length - 1];

  return (
    <>
      <tr className="border-b last:border-0 hover:bg-gray-50">
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{ticket.id.slice(0, 8)}…</td>
        <td className="px-4 py-3 text-sm text-gray-700">{ticket.user.email}</td>
        <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">{ticket.subject}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{TICKET_CATEGORY_LABELS[ticket.category] ?? ticket.category}</td>
        <td className="px-4 py-3">
          <select
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value as TicketStatus;
              setStatus(nextStatus);
              statusMutation.mutate(nextStatus);
            }}
            disabled={statusMutation.isPending}
            className={`cursor-pointer rounded-full border-0 px-2 py-1 text-xs font-medium disabled:opacity-50 ${TICKET_STATUS_COLORS[status]}`}
          >
            {TICKET_STATUSES.map((ticketStatus) => (
              <option key={ticketStatus} value={ticketStatus}>{TICKET_STATUS_LABELS[ticketStatus]}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('vi-VN')}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setShowReply((value) => !value)}
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
      {showReply ? (
        <tr className="border-b bg-indigo-50">
          <td colSpan={7} className="px-4 py-3">
            {lastMessage ? (
              <div className="mb-3 rounded-md border border-gray-200 bg-white p-3">
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Tin nhắn cuối ({lastMessage.isAdmin ? 'Admin' : 'Khách'}
                  {' • '}{new Date(lastMessage.createdAt).toLocaleDateString('vi-VN')}):
                </p>
                <p className="line-clamp-3 text-sm text-gray-700">{lastMessage.content}</p>
              </div>
            ) : null}
            {aiAssist ? (
              <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">AI gợi ý</span>
                  <span className="text-xs text-emerald-700">
                    {TICKET_CATEGORY_LABELS[aiAssist.suggestedCategory] ?? aiAssist.suggestedCategory}
                    {' / '}
                    {TICKET_STATUS_LABELS[aiAssist.suggestedStatus] ?? aiAssist.suggestedStatus}
                  </span>
                  {aiAssist.fallback ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Chế độ dự phòng</span>
                  ) : null}
                </div>
                <p className="text-sm text-emerald-950">{aiAssist.summary}</p>
              </div>
            ) : null}
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
                onClick={() => assistMutation.mutate()}
                disabled={assistMutation.isPending}
                className="rounded-md border border-emerald-300 bg-white px-4 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {assistMutation.isPending ? 'AI đang gợi ý...' : 'AI gợi ý'}
              </button>
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
                onClick={() => { setShowReply(false); setReplyText(''); setAiAssist(null); }}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState('');

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets', statusFilter],
    queryFn: () => adminApi.getTickets(statusFilter || undefined),
  });

  const openTickets = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  const activeTickets = tickets.filter((ticket) => ticket.status === 'IN_PROGRESS').length;
  const totalMessages = tickets.reduce((sum, ticket) => sum + ticket._count.messages, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        icon={Ticket}
        title="Hỗ trợ"
        description="Theo dõi phiếu hỗ trợ khách hàng, trạng thái xử lý và bản nháp phản hồi AI trong một khung giao diện để nhìn nhanh khi demo."
        badge="Bàn hỗ trợ"
        tone="sky"
        stats={[
          { label: 'Tổng phiếu', value: isLoading ? '...' : `${tickets.length}` },
          { label: 'Đang mở', value: isLoading ? '...' : `${openTickets}` },
          { label: 'Đang xử lý', value: isLoading ? '...' : `${activeTickets}` },
          { label: 'Tin nhắn', value: isLoading ? '...' : `${totalMessages}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <AdminMetricCard icon={Headset} label="Đang mở" value={isLoading ? '...' : `${openTickets}`} hint="Cần phân luồng hoặc tiếp nhận" tone="amber" />
        <AdminMetricCard icon={MailPlus} label="Đang xử lý" value={isLoading ? '...' : `${activeTickets}`} hint="Phiếu hỗ trợ đang được đội chăm sóc thao tác" tone="indigo" />
        <AdminMetricCard icon={Sparkles} label="Tổng hội thoại" value={isLoading ? '...' : `${totalMessages}`} hint="Tổng tin nhắn trong luồng hiện tại" tone="emerald" />
      </div>

      <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
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
          {!isLoading && tickets.length === 0 ? (
            <div className="p-4">
              <AdminEmptyState
                icon={Ticket}
                title="Chưa có yêu cầu hỗ trợ"
                description="Khi khách hàng tạo phiếu hỗ trợ, danh sách hỗ trợ và các bản nháp AI sẽ hiện ở đây."
                tone="sky"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
