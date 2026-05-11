'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, FAQ } from '../../../lib/admin-api';
import { TICKET_CATEGORY_LABELS, FAQ_CATEGORIES } from '../_constants';

interface FaqModalProps {
  existing?: FAQ;
  onClose: () => void;
  onSaved: () => void;
}

function FaqModal({ existing, onClose, onSaved }: FaqModalProps) {
  const [question, setQuestion] = useState(existing?.question ?? '');
  const [answer, setAnswer] = useState(existing?.answer ?? '');
  const [category, setCategory] = useState(existing?.category ?? 'OTHER');
  const [sortOrder, setSortOrder] = useState(existing?.sortOrder ?? 0);
  const [isPublished, setIsPublished] = useState(existing?.isPublished ?? false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      existing
        ? adminApi.updateFaq(existing.id, { question, answer, category, sortOrder, isPublished })
        : adminApi.createFaq({ question, answer, category, sortOrder, isPublished }),
    onSuccess: () => { onSaved(); onClose(); },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          {existing ? 'Chỉnh sửa FAQ' : 'Thêm FAQ mới'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Câu hỏi</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Nhập câu hỏi..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Câu trả lời</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Nhập câu trả lời..."
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              >
                {FAQ_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{TICKET_CATEGORY_LABELS[c] ?? c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Thứ tự</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex flex-col justify-end pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                />
                Đã đăng
              </label>
            </div>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={!question.trim() || !answer.trim() || mutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {mutation.isPending ? 'Đang lưu...' : existing ? 'Cập nhật' : 'Tạo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FaqPage() {
  const queryClient = useQueryClient();
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [deletingFaqId, setDeletingFaqId] = useState<string | null>(null);

  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: () => adminApi.getAllFaq(),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
      setDeletingFaqId(null);
    },
  });

  const toggleFaqPublishedMutation = useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      adminApi.updateFaq(id, { isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-faq'] }),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {isLoading ? 'Đang tải...' : `${faqs.length} FAQ`}
        </h2>
        <button
          type="button"
          onClick={() => { setEditingFaq(null); setShowFaqModal(true); }}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          + Thêm FAQ
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Câu hỏi</th>
              <th className="px-4 py-2 text-left">Danh mục</th>
              <th className="px-4 py-2 text-left">Đã đăng</th>
              <th className="px-4 py-2 text-left">Thứ tự</th>
              <th className="px-4 py-2 text-left">Sửa</th>
              <th className="px-4 py-2 text-left">Xóa</th>
            </tr>
          </thead>
          <tbody>
            {faqs.map((faq) => (
              <tr key={faq.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-900">{faq.question}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {TICKET_CATEGORY_LABELS[faq.category] ?? faq.category}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleFaqPublishedMutation.mutate({ id: faq.id, isPublished: !faq.isPublished })}
                    disabled={toggleFaqPublishedMutation.isPending}
                    aria-pressed={faq.isPublished}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
                      faq.isPublished ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {faq.isPublished ? 'Đang đăng' : 'Ẩn'}
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{faq.sortOrder}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => { setEditingFaq(faq); setShowFaqModal(true); }}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Sửa
                  </button>
                </td>
                <td className="px-4 py-3">
                  {deletingFaqId === faq.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => deleteFaqMutation.mutate(faq.id)}
                        disabled={deleteFaqMutation.isPending}
                        className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        Xác nhận
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingFaqId(null)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeletingFaqId(faq.id)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && faqs.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-gray-400">Chưa có FAQ nào.</p>
        )}
      </div>

      {showFaqModal && (
        <FaqModal
          existing={editingFaq ?? undefined}
          onClose={() => { setShowFaqModal(false); setEditingFaq(null); }}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-faq'] })}
        />
      )}
    </div>
  );
}
