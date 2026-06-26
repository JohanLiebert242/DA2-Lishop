'use client';

import { useEffect, useRef, useState } from 'react';
import { useShopChat } from '@lishop/shared';
import { ordersApi } from '../lib/orders-api';

interface ShopChatPanelProps {
  open: boolean;
  onClose: () => void;
  shopName: string;
  shopSlug: string;
  orderNumber: string;
}

export function ShopChatPanel({ open, onClose, shopName, shopSlug, orderNumber }: ShopChatPanelProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ id: string; from: 'buyer' | 'shop'; text: string; time: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingOptimisticIds = useRef<Set<string>>(new Set());

  // Fetch chat history when panel opens
  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setConfirmText(null);
    setLoading(true);
    ordersApi.getShopChat(shopSlug).then((data) => {
      setShopId(data.shopId);
      setMessages(
        data.messages.map((msg) => ({
          id: msg.id,
          from: msg.isFromShop ? 'shop' : 'buyer' as const,
          text: msg.content,
          time: msg.createdAt,
        })),
      );
    }).catch(() => {
      // Fallback if API fails
      setMessages([]);
    }).finally(() => setLoading(false));
  }, [open, shopSlug]);

  // WebSocket for real-time messages
  const { isOnline } = useShopChat({
    enabled: open && !!shopId,
    shopId,
    onMessage: (msg) => {
      setMessages((prev) => {
        // Remove any pending optimistic messages now that the real one has arrived
        const cleaned = prev.filter((m) => !pendingOptimisticIds.current.has(m.id));
        if (cleaned.some((m) => m.id === msg.id)) return cleaned;
        return [
          ...cleaned,
          { id: msg.id, from: msg.isFromShop ? 'shop' : 'buyer', text: msg.content, time: msg.createdAt },
        ];
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    setConfirmText(null);

    // Optimistic add so the message shows immediately
    const optimisticId = `opt-${Date.now()}`;
    pendingOptimisticIds.current.add(optimisticId);
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, from: 'buyer', text, time: new Date().toISOString() },
    ]);

    try {
      const result = await ordersApi.sendShopChat(shopSlug, text);
      pendingOptimisticIds.current.delete(optimisticId);
      // Replace optimistic message with the real one from the server
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { id: result.id, from: 'buyer', text: result.content, time: result.createdAt }
            : m,
        ),
      );
      setConfirmText('Shop đã nhận tin nhắn');
    } catch {
      pendingOptimisticIds.current.delete(optimisticId);
      // Keep the optimistic message visible even if send fails
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div data-testid="order-shop-chat-panel" className="fixed bottom-24 left-6 z-50 flex h-[460px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-red-500 px-4 py-3 text-white">
        <div>
          <p className="font-bold">{shopName}</p>
          <p className="flex items-center gap-1.5 text-xs text-red-50">
            <span className={`inline-block h-2 w-2 rounded-full ${isOnline ? 'bg-green-300' : 'bg-stone-300'}`} />
            {isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
            <span className="ml-1">· Đơn hàng #{orderNumber}</span>
            {confirmText && <span className="ml-2 inline-block rounded bg-red-400 px-2 py-0.5 text-[10px]">{confirmText}</span>}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm font-bold hover:bg-red-600">x</button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 px-3 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <span className="text-sm text-stone-400">Đang tải tin nhắn...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-center">
            <div>
              <p className="text-sm font-medium text-stone-500">Chưa có tin nhắn</p>
              <p className="mt-1 text-xs text-stone-400">Gửi tin nhắn để liên hệ với cửa hàng</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={`${msg.id}-${index}`} className={`flex ${msg.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.from === 'buyer' ? 'bg-red-500 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200'}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 border-t border-stone-200 px-3 py-2">
        <input
          data-testid="order-shop-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Nhập tin nhắn..."
          className="min-w-0 flex-1 rounded-full border border-stone-200 px-3 py-2 text-sm outline-none focus:border-red-300"
        />
        <button
          type="button"
          data-testid="order-shop-chat-send"
          onClick={handleSend}
          disabled={sending}
          className="rounded-full bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {sending ? '...' : 'Gửi'}
        </button>
      </div>
    </div>
  );
}
