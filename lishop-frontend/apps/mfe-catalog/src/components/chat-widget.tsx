'use client';

import { useState, useRef, useEffect } from 'react';
import { formatVND } from '@lishop/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatProduct {
  name: string;
  priceVnd: number;
  slug: string;
  imageUrl?: string;
}

interface ChatFaq {
  question: string;
  answer: string;
}

type MessageType = 'text' | 'products' | 'faq';

interface BotMessage {
  role: 'bot';
  type: MessageType;
  text?: string;
  products?: ChatProduct[];
  faq?: ChatFaq;
}

interface UserMessage {
  role: 'user';
  text: string;
}

type ChatMessage = BotMessage | UserMessage;

const QUICK_REPLIES = ['Tìm sản phẩm', 'Theo dõi đơn hàng', 'Chính sách đổi trả'];

const API_URL = 'http://localhost:4000';

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="flex gap-1 rounded-2xl rounded-bl-none bg-gray-100 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: ChatProduct }) {
  return (
    <a
      href={`http://localhost:3002/products/${product.slug}`}
      className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
    >
      {product.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-24 w-full object-cover"
        />
      ) : (
        <div className="flex h-24 items-center justify-center bg-gray-100 text-gray-400 text-xs">
          Chưa có ảnh
        </div>
      )}
      <div className="p-2">
        <p className="line-clamp-2 text-xs font-medium text-gray-800">{product.name}</p>
        <p className="mt-1 text-xs font-semibold text-indigo-600">{formatVND(product.priceVnd)}</p>
      </div>
    </a>
  );
}

function FaqCard({ faq }: { faq: ChatFaq }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-800"
      >
        <span className="pr-2">{faq.question}</span>
        <span className="shrink-0 text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-600 leading-relaxed">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-none bg-blue-500 px-4 py-2 text-sm text-white">
          {msg.text}
        </div>
      </div>
    );
  }

  // bot message
  if (msg.type === 'products' && msg.products && msg.products.length > 0) {
    return (
      <div className="flex flex-col gap-2">
        {msg.text && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-none bg-gray-100 px-4 py-2 text-sm text-gray-800">
            {msg.text}
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {msg.products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </div>
    );
  }

  if (msg.type === 'faq' && msg.faq) {
    return (
      <div className="flex flex-col gap-2">
        {msg.text && (
          <div className="max-w-[85%] rounded-2xl rounded-bl-none bg-gray-100 px-4 py-2 text-sm text-gray-800">
            {msg.text}
          </div>
        )}
        <FaqCard faq={msg.faq} />
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-none bg-gray-100 px-4 py-2 text-sm text-gray-800">
        {msg.text}
      </div>
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  // Show greeting on first open
  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      setMessages([
        {
          role: 'bot',
          type: 'text',
          text: 'Xin chào! Tôi có thể giúp gì cho bạn?',
        },
      ]);
    }
  }, [open, initialized]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const userMsg: UserMessage = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setTyping(true);

    try {
      const res = await fetch(`${API_URL}/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      const data = json.data ?? json; // { reply, type, data? }

      const botMsg: BotMessage = {
        role: 'bot',
        type: (data.type as MessageType) ?? 'text',
        text: data.reply,
        products: data.type === 'products' ? (data.data as ChatProduct[]) : undefined,
        faq: data.type === 'faq' ? (data.data as ChatFaq) : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', type: 'text', text: 'Có lỗi xảy ra. Vui lòng thử lại sau.' },
      ]);
    } finally {
      setTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Mở hỗ trợ chat"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700 focus:outline-none"
      >
        <span className="text-2xl" aria-hidden>
          {open ? '✕' : '💬'}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[420px] w-80 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>💬</span>
              <span className="font-semibold text-white">Hỗ trợ</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng chat"
              className="rounded-full p-1 text-indigo-200 hover:bg-indigo-700 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Message list */}
          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {/* Quick reply chips (only after first greeting, before any user message) */}
            {messages.length === 1 && messages[0]?.role === 'bot' && (
              <div className="flex flex-wrap gap-2">
                {QUICK_REPLIES.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => sendMessage(chip)}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập tin nhắn..."
              disabled={typing}
              className="flex-1 rounded-full border border-gray-300 px-4 py-1.5 text-sm focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              aria-label="Gửi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
