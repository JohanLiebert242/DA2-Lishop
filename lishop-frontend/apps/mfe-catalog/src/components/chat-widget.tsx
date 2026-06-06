'use client';

import { useEffect, useRef, useState } from 'react';
import { formatVND } from '@lishop/shared';
import { catalogApi, ConciergeCartItem, ShoppingConciergeResponse } from '../lib/catalog-api';
import { addToCart } from '../lib/cart-helper';

type Message =
  | { role: 'user'; text: string }
  | { role: 'bot'; text: string; concierge?: ShoppingConciergeResponse; error?: boolean };

const CATALOG_URL = process.env['NEXT_PUBLIC_MFE_CATALOG_URL'] ?? 'http://localhost:3002';

const QUICK_REPLIES = [
  'Toi can combo di lam duoi 1 trieu',
  'Goi y qua sinh nhat cho nu',
  'Tim san pham dang mua nhat',
];

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-2xl rounded-bl-none bg-gray-100 px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" />
      </div>
    </div>
  );
}

function CartPlanCard({
  item,
  onAdd,
  adding,
}: {
  item: ConciergeCartItem;
  onAdd: (item: ConciergeCartItem) => void;
  adding: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-emerald-100 bg-white p-2">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-md object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gray-100 text-xs text-gray-400">
          Anh
        </div>
      )}
      <div className="min-w-0 flex-1">
        <a
          href={`${CATALOG_URL}/products/${item.slug}`}
          className="line-clamp-1 text-sm font-semibold text-gray-900 hover:text-indigo-700"
        >
          {item.name}
        </a>
        <p className="mt-0.5 text-xs text-gray-500">{item.reason}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-indigo-700">
            {item.quantity} x {formatVND(item.priceVnd)}
          </span>
          <button
            type="button"
            onClick={() => onAdd(item)}
            disabled={adding}
            className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Them
          </button>
        </div>
      </div>
    </div>
  );
}

function ConciergeResult({
  result,
  onAdd,
  onAddAll,
  adding,
}: {
  result: ShoppingConciergeResponse;
  onAdd: (item: ConciergeCartItem) => void;
  onAddAll: (items: ConciergeCartItem[]) => void;
  adding: boolean;
}) {
  const total = result.cartPlan.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);

  return (
    <div className="space-y-2">
      {result.cartPlan.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Gio hang goi y</p>
              <p className="text-xs text-emerald-700">Tam tinh {formatVND(total)}</p>
            </div>
            <button
              type="button"
              data-testid="concierge-add-all"
              onClick={() => onAddAll(result.cartPlan)}
              disabled={adding}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Them tat ca
            </button>
          </div>
          <div className="space-y-2">
            {result.cartPlan.map((item) => (
              <CartPlanCard key={item.productId} item={item} onAdd={onAdd} adding={adding} />
            ))}
          </div>
        </div>
      )}

      {result.items.length > 0 && result.cartPlan.length === 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {result.items.slice(0, 4).map((item) => (
            <a
              key={item.id}
              href={`${CATALOG_URL}/products/${item.slug}`}
              className="w-36 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt={item.name} className="h-20 w-full object-cover" />
              ) : (
                <div className="flex h-20 items-center justify-center bg-gray-100 text-xs text-gray-400">Anh</div>
              )}
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-semibold text-gray-800">{item.name}</p>
                <p className="mt-1 text-xs font-bold text-indigo-700">{formatVND(item.priceVnd)}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  onAdd,
  onAddAll,
  adding,
}: {
  msg: Message;
  onAdd: (item: ConciergeCartItem) => void;
  onAddAll: (items: ConciergeCartItem[]) => void;
  adding: boolean;
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-none bg-indigo-600 px-4 py-2 text-sm text-white">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`max-w-[88%] rounded-2xl rounded-bl-none px-4 py-2 text-sm ${
          msg.error ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {msg.text}
      </div>
      {msg.concierge && (
        <ConciergeResult result={msg.concierge} onAdd={onAdd} onAddAll={onAddAll} adding={adding} />
      )}
    </div>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing, notice]);

  useEffect(() => {
    if (open && !initialized) {
      setInitialized(true);
      setMessages([
        {
          role: 'bot',
          text: 'Xin chao, minh la AI Shopping Concierge cua Lishop. Hay noi nhu cau, ngan sach hoac dip mua sam cua ban.',
        },
      ]);
    }
  }, [open, initialized]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setTyping(true);
    setNotice('');

    try {
      const result = await catalogApi.shoppingConcierge(trimmed);
      setMessages((prev) => [...prev, { role: 'bot', text: result.reply, concierge: result }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Concierge dang gap loi. Ban vui long thu lai sau.', error: true },
      ]);
    } finally {
      setTyping(false);
    }
  }

  async function handleAdd(item: ConciergeCartItem) {
    setAdding(true);
    setNotice('');
    try {
      await addToCart(item.productId, item.quantity);
      setNotice(`Da them ${item.name} vao gio.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Khong the them vao gio.');
    } finally {
      setAdding(false);
    }
  }

  async function handleAddAll(items: ConciergeCartItem[]) {
    setAdding(true);
    setNotice('');
    try {
      for (const item of items) {
        await addToCart(item.productId, item.quantity);
      }
      setNotice(`Da them ${items.length} san pham goi y vao gio.`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Khong the them tat ca vao gio.');
    } finally {
      setAdding(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Mo AI Shopping Concierge"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-indigo-700 focus:outline-none"
      >
        {open ? 'x' : 'AI'}
      </button>

      {open && (
        <div
          data-testid="shopping-concierge"
          className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between bg-indigo-600 px-4 py-3">
            <div>
              <p className="font-semibold text-white">AI Shopping Concierge</p>
              <p className="text-xs text-indigo-100">Tu van va tao gio hang goi y</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Dong Concierge"
              className="rounded-full px-2 py-1 text-sm font-bold text-indigo-100 hover:bg-indigo-700 hover:text-white"
            >
              x
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message, index) => (
              <MessageBubble
                key={`${message.role}-${index}`}
                msg={message}
                onAdd={handleAdd}
                onAddAll={handleAddAll}
                adding={adding}
              />
            ))}

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
            {notice && (
              <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                {notice}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-gray-200 px-3 py-2">
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mo ta nhu cau mua sam..."
              disabled={typing}
              className="flex-1 rounded-full border border-gray-300 px-4 py-1.5 text-sm focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || typing}
              aria-label="Gui yeu cau"
              className="flex h-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Gui
            </button>
          </div>
        </div>
      )}
    </>
  );
}
