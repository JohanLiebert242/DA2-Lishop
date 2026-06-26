'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, Search, Loader2 } from 'lucide-react';
import { useShopChat } from '@lishop/shared';
import { sellerApi } from '@/lib/seller-api';

interface Conversation {
  userId: string;
  customerName: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
}

interface ChatMessage {
  id: string;
  shopId: string;
  userId: string;
  content: string;
  isFromShop: boolean;
  createdAt: string;
}

function formatChatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return date.toLocaleDateString('vi-VN');
}

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: shop } = useQuery({
    queryKey: ['seller-chat-shop'],
    queryFn: () => sellerApi.getSellerChatShop(),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['seller-conversations'],
    queryFn: () => sellerApi.getConversations(),
    refetchInterval: 10_000,
  });

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['seller-conversation-messages', selectedUserId],
    queryFn: () => sellerApi.getConversationMessages(selectedUserId!),
    enabled: !!selectedUserId,
  });

  // WebSocket for real-time messages — connect as soon as we have the shopId
  const shopId = shop?.id ?? null;
  useShopChat({
    enabled: !!shopId,
    shopId,
    onMessage: (msg) => {
      if (msg.userId === selectedUserId) {
        queryClient.setQueryData<ChatMessage[]>(['seller-conversation-messages', selectedUserId], (prev = []) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, { ...msg, createdAt: msg.createdAt }];
        });
      }
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['my-shop'] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => sellerApi.sendConversationReply(selectedUserId!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversation-messages', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['seller-conversations'] });
    },
  });

  function handleSend() {
    const text = input.trim();
    if (!text || !selectedUserId || sendMutation.isPending) return;
    sendMutation.mutate(text);
    setInput('');
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-0 overflow-hidden rounded-xl border bg-white shadow-sm">
      {/* Conversation List */}
      <div className="flex w-80 shrink-0 flex-col border-r">
        <div className="border-b px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">Chat với khách hàng</h1>
          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Tìm khách hàng..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <MessageCircle className="mb-3 h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Chưa có hội thoại nào</p>
              <p className="mt-1 text-xs text-gray-400">Khi khách hàng nhắn tin, hội thoại sẽ hiện ở đây.</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => {
                  setSelectedUserId(conv.userId);
                }}
                className={`w-full border-b px-4 py-3 text-left transition hover:bg-gray-50 ${
                  selectedUserId === conv.userId ? 'bg-violet-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                    {conv.customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{conv.customerName}</p>
                    <p className="truncate text-xs text-gray-500">{conv.lastMessage}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{formatChatTime(conv.lastMessageAt)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-1 flex-col">
        {!selectedUserId ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Chọn một hội thoại để xem tin nhắn</p>
            </div>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 py-4">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-10">
                  <p className="text-sm text-gray-400">Chưa có tin nhắn nào</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isFromShop ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                        msg.isFromShop
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-gray-800 ring-1 ring-gray-200'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          msg.isFromShop ? 'text-violet-200' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 border-t px-4 py-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-700 disabled:opacity-50"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
