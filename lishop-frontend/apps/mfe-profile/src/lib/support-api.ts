const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)lishop_at=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? 'Request failed');
  return (json.data ?? json) as T;
}

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketCategory = 'ORDER' | 'PRODUCT' | 'SHIPPING' | 'PAYMENT' | 'RETURN' | 'OTHER';

export interface TicketSummary {
  id: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: string;
  _count: { messages: number };
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  isAdmin: boolean;
  content: string;
  createdAt: string;
}

export interface TicketDetail {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  orderRef: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  messages: TicketMessage[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export interface FaqGroup {
  category: string;
  items: FaqItem[];
}

export interface CreateTicketDto {
  category: TicketCategory;
  subject: string;
  description: string;
  orderRef?: string;
}

export function getMyTickets(): Promise<TicketSummary[]> {
  return apiFetch<TicketSummary[]>('/support/tickets');
}

export function getTicket(id: string): Promise<TicketDetail> {
  return apiFetch<TicketDetail>(`/support/tickets/${id}`);
}

export function createTicket(dto: CreateTicketDto): Promise<TicketDetail> {
  return apiFetch<TicketDetail>('/support/tickets', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function addMessage(ticketId: string, content: string): Promise<TicketMessage> {
  return apiFetch<TicketMessage>(`/support/tickets/${ticketId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export function getFaq(): Promise<FaqGroup[]> {
  return apiFetch<FaqGroup[]>('/support/faq');
}

export function searchFaq(q: string): Promise<FaqItem[]> {
  return apiFetch<FaqItem[]>(`/support/faq/search?q=${encodeURIComponent(q)}`);
}
