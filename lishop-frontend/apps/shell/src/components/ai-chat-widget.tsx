'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const CATALOG_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';
const PROFILE_URL = process.env['NEXT_PUBLIC_MFE_PROFILE_URL'] ?? 'http://localhost:3006';

type ChatRole = 'assistant' | 'user';

interface ProductSuggestion {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  brand?: string;
}

interface FaqSuggestion {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ChatResponse {
  reply: string;
  type: 'text' | 'products' | 'faq';
  data?: Array<ProductSuggestion | FaqSuggestion>;
}

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  responseType?: ChatResponse['type'];
  data?: ChatResponse['data'];
}

function isProduct(item: ProductSuggestion | FaqSuggestion): item is ProductSuggestion {
  return 'slug' in item;
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào, mình là trợ lý Lishop. Bạn cần tìm sản phẩm, kiểm tra đơn hàng hay hỏi về đổi trả?',
      responseType: 'text',
    },
  ]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function sendMessage(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    setInput('');
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', content: message },
    ]);

    try {
      const response = await fetch(`${API_URL}/support/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message ?? 'Không thể gửi tin nhắn');
      const data = (json.data ?? json) as ChatResponse;
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          responseType: data.type,
          data: data.data,
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Hiện chưa thể kết nối trợ lý. Bạn có thể tạo yêu cầu hỗ trợ để được xử lý.',
          responseType: 'text',
        },
      ]);
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
      {open && (
        <section
          id="shell-ai-chat-panel"
          data-testid="shell-ai-chat-panel"
          className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/18"
        >
          <header className="border-b border-stone-100 bg-stone-950 px-4 py-3 text-white">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black">Trợ lý AI Lishop</p>
                <p className="mt-0.5 text-xs font-semibold text-stone-300">Hỏi nhanh về đơn hàng, sản phẩm và hỗ trợ.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-stone-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng chat AI"
              >
                x
              </button>
            </div>
          </header>

          <div className="max-h-[24rem] space-y-3 overflow-y-auto bg-stone-50 px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'border border-stone-200 bg-white text-stone-700 shadow-sm'
                  }`}
                >
                  <p>{message.content}</p>
                  {message.role === 'assistant' && message.data && message.data.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.data.slice(0, 3).map((item) =>
                        isProduct(item) ? (
                          <Link
                            key={item.id}
                            href={`${CATALOG_URL}/products/${item.slug}`}
                            className="block rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50"
                          >
                            <span className="block font-bold text-stone-900">{item.name}</span>
                            <span className="text-xs font-semibold text-indigo-700">{formatVND(item.priceVnd)}</span>
                          </Link>
                        ) : (
                          <Link
                            key={item.id}
                            href={`${PROFILE_URL}/support/faq`}
                            className="block rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 transition hover:border-indigo-200 hover:bg-indigo-50"
                          >
                            <span className="block font-bold text-stone-900">{item.question}</span>
                            <span className="line-clamp-2 text-xs text-stone-500">{item.answer}</span>
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-sm font-semibold text-stone-500 shadow-sm">
                  Đang trả lời...
                </div>
              </div>
            )}
          </div>

          <form onSubmit={sendMessage} className="flex gap-2 border-t border-stone-100 bg-white p-3">
            <input
              ref={inputRef}
              data-testid="shell-ai-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              className="min-w-0 flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              data-testid="shell-ai-chat-send"
              type="submit"
              disabled={isSending || !input.trim()}
              className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </section>
      )}

      <button
        data-testid="shell-ai-chat-toggle"
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="flex h-14 items-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-black text-white shadow-xl shadow-stone-900/20 transition hover:bg-indigo-600"
        aria-expanded={open}
        aria-controls="shell-ai-chat-panel"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-stone-950">AI</span>
        <span className="hidden sm:inline">Hỗ trợ</span>
      </button>
    </div>
  );
}
