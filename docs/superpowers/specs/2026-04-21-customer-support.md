# Customer Support — Design Spec

**Date:** 2026-04-21
**Project:** Lishop (Vietnamese e-commerce platform)
**Scope:** 3 clusters — support tickets, chatbot, FAQ

---

## Baseline

No support/chat/FAQ code exists anywhere. This is fully greenfield.

Existing infrastructure to leverage:
- Notification system (`createNotification`) — for ticket reply alerts
- ProductsService.findMany with `q:` search param — for chatbot product lookup
- Admin tab-based UI (6 tabs today: orders, users, promotions, analytics, inventory, returns)
- mfe-profile AccountSidebar (4 nav items today: Đơn hàng, Trang cá nhân, Yêu thích, Thông báo)

---

## Schema Changes

### New enums

```prisma
enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketCategory {
  ORDER
  PRODUCT
  SHIPPING
  PAYMENT
  RETURN
  OTHER
}
```

### New models

```prisma
model SupportTicket {
  id        String         @id @default(uuid())
  userId    String
  orderRef  String?        // optional order number for context
  category  TicketCategory
  subject   String
  status    TicketStatus   @default(OPEN)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  user     User             @relation(fields: [userId], references: [id])
  messages TicketMessage[]

  @@index([userId])
  @@index([status])
  @@index([createdAt])
}

model TicketMessage {
  id        String   @id @default(uuid())
  ticketId  String
  userId    String
  isAdmin   Boolean  @default(false)
  content   String
  createdAt DateTime @default(now())

  ticket SupportTicket @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  user   User          @relation(fields: [userId], references: [id])

  @@index([ticketId])
}

model FAQ {
  id          String   @id @default(uuid())
  question    String
  answer      String
  category    String   // general | order | shipping | payment | return | product
  sortOrder   Int      @default(0)
  isPublished Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([isPublished])
}
```

### Model modifications

```prisma
// User — add relations
model User {
  ...
  supportTickets  SupportTicket[]
  ticketMessages  TicketMessage[]
}
```

---

## Cluster 1 — Support Tickets

### 1.1 Backend — SupportModule

New module: `apps/api/src/modules/support/`

Files: `support-tickets.repository.ts`, `support-tickets.service.ts`, `support.controller.ts`, `faq.repository.ts`, `faq.service.ts`, `chatbot.service.ts`, `support.module.ts`, `dto/`

**Customer endpoints** (auth required, `/support/tickets`):

| Method | Path | Description |
|---|---|---|
| POST | /support/tickets | Create ticket (body: category, subject, description, orderRef?) |
| GET | /support/tickets | My ticket list (status, subject, createdAt, messageCount) |
| GET | /support/tickets/:id | Ticket detail + messages |
| POST | /support/tickets/:id/messages | Add message to ticket |

`POST /support/tickets` → also fires notification to all admins: "Ticket mới từ khách hàng"  
`POST /support/tickets/:id/messages` (customer reply) → fires notification to admins  
Admin reply → fires notification to ticket owner

**Admin endpoints** (admin only):

| Method | Path | Description |
|---|---|---|
| GET | /admin/tickets | All tickets (optional ?status= filter) |
| PATCH | /admin/tickets/:id/status | Update status (OPEN/IN_PROGRESS/RESOLVED/CLOSED) |
| POST | /admin/tickets/:id/messages | Admin reply (creates TicketMessage with isAdmin=true) |

First admin reply auto-transitions status from OPEN → IN_PROGRESS.

### 1.2 DTOs

```typescript
// CreateTicketDto
category: TicketCategory (enum)
subject: string (max 200)
description: string (max 2000) — becomes the first TicketMessage
orderRef?: string (max 50)

// AddMessageDto
content: string (min 1, max 2000)

// UpdateTicketStatusDto
status: TicketStatus (enum)
```

### 1.3 Ticket repository methods

```
create(userId, dto) → creates SupportTicket + first TicketMessage in transaction
findByUserId(userId) → TicketSummary[] (no messages)
findById(id) → TicketDetail (with messages + user info)
findAll(status?) → AdminTicketItem[] (with user email, messageCount, lastMessage)
updateStatus(id, status) → SupportTicket
addMessage(ticketId, userId, content, isAdmin) → TicketMessage
```

---

## Cluster 2 — Chatbot

### 2.1 Backend — ChatbotService

Stateless — no DB writes. Pure logic + calls to existing repositories.

**Endpoint:**
```
POST /support/chat (public — no auth required)
Body: { message: string, productSlug?: string }
Response: { reply: string, type: 'text' | 'products' | 'faq', data?: ProductSummary[] | FAQ[] }
```

**Rule-based matching logic** (Vietnamese keyword detection):

| Keywords (case-insensitive) | Action | Response type |
|---|---|---|
| "giá", "bao nhiêu", "rẻ nhất", "đắt nhất", "tìm", "sản phẩm" | Search products with `q: message` | `products` |
| "theo dõi", "tracking", "đơn hàng", "kiểm tra đơn" | Canned order tracking guide | `text` |
| "đổi trả", "hoàn tiền", "trả hàng", "refund" | Return policy canned response | `text` |
| "vận chuyển", "giao hàng", "ship", "phí ship" | Shipping info canned response | `text` |
| "thanh toán", "payment", "cod", "vnpay", "momo" | Payment methods canned response | `text` |
| "liên hệ", "hỗ trợ", "gặp người thật", "tư vấn" | Suggest creating support ticket | `text` |
| Anything else | Search FAQ by keyword first → if match return FAQ | `faq` |
| No match | Default: "Tôi chưa hiểu câu hỏi này..." + suggest ticket creation | `text` |

`ProductSummary` shape: `{ id, name, slug, priceVnd, averageRating, primaryImage }`

`ChatbotService` needs access to `ProductsRepository` (for product search) and `FaqRepository` (for FAQ search).

### 2.2 Frontend — Chat Widget

New component: `apps/mfe-catalog/src/components/chat-widget.tsx`

- Floating button (bottom-right corner): chat bubble icon
- Click opens panel (fixed, above product content): 300×420px
- Shows conversation history in component state (session-only, no persistence)
- Input field + send button
- Renders bot replies based on `type`:
  - `text`: plain message bubble
  - `products`: horizontal scroll of 3 ProductCard-like tiles (name, price, image, link to product)
  - `faq`: expandable answer card
- Typing indicator while waiting for response
- First bot message on open: "Xin chào! Tôi có thể giúp gì cho bạn?" + 3 quick-reply chips: ["Tìm sản phẩm", "Theo dõi đơn hàng", "Chính sách đổi trả"]
- Embedded in `mfe-catalog/src/app/products/[slug]/page.tsx` (product detail only — where users most need help)

---

## Cluster 3 — FAQ Management

### 3.1 Backend — FaqModule (inside SupportModule)

**Public endpoints** (no auth):
```
GET /support/faq              — list published FAQs, grouped by category
GET /support/faq/search?q=    — search FAQs by question text (ILIKE)
```

**Admin endpoints**:
```
GET    /admin/faq              — all FAQs (including unpublished)
POST   /admin/faq              — create FAQ
PATCH  /admin/faq/:id          — update FAQ (question, answer, category, sortOrder, isPublished)
DELETE /admin/faq/:id          — delete FAQ
```

### 3.2 FAQ Repository methods

```
findPublished() → FAQ[] grouped by category (sorted by sortOrder)
search(q) → FAQ[] where question ILIKE %q%
findAll() → FAQ[] (admin, all including unpublished)
create(dto) → FAQ
update(id, dto) → FAQ
delete(id) → FAQ
```

### 3.3 Frontend — FAQ Page

New page: `apps/mfe-profile/src/app/support/faq/page.tsx`

- Accordion-style FAQ list grouped by category
- Search input at top
- Empty state if no results
- Links to create a ticket at bottom ("Không tìm thấy câu trả lời? Tạo yêu cầu hỗ trợ")

---

## Frontend: mfe-profile Support Pages

### New pages

**`apps/mfe-profile/src/app/support/page.tsx`** — ticket list
- Ticket table: subject | category | status | date | "Xem"
- "Tạo yêu cầu mới" button → opens modal
- Create modal: category dropdown + subject input + description textarea + optional orderRef
- Status badges: OPEN=amber, IN_PROGRESS=blue, RESOLVED=emerald, CLOSED=gray

**`apps/mfe-profile/src/app/support/[id]/page.tsx`** — ticket detail
- Ticket header (subject, category, status badge, date)
- Message thread (customer messages right-aligned, admin messages left-aligned with "Hỗ trợ viên" label)
- Reply input at bottom (if status != CLOSED)
- Auto-scroll to latest message

**AccountSidebar update** — add:
```typescript
{ icon: '🎧', label: 'Hỗ trợ', href: `${MFE_PROFILE}/support`, key: 'support' }
```
Extend `activeSection` type to include `'support'`.

### New API client: `apps/mfe-profile/src/lib/support-api.ts`

```typescript
getMyTickets() → TicketSummary[]
getTicket(id) → TicketDetail
createTicket(dto) → SupportTicket
addMessage(ticketId, content) → TicketMessage
getFaq() → FaqGroup[]
searchFaq(q) → FAQ[]
```

---

## Frontend: mfe-admin Support Tabs

### New tabs in `apps/mfe-admin/src/app/admin/page.tsx`

Add to `Tab` type: `'tickets' | 'faq'`
Add to `TAB_LABELS`: `tickets: 'Hỗ trợ'`, `faq: 'FAQ'`

**Tickets tab**:
- Status filter tabs at top (All / Open / In Progress / Resolved / Closed)
- Table: #ID | Customer email | Subject | Category | Status | Date | Reply button
- "Reply" opens inline panel below row OR modal with message thread + reply input
- Status update dropdown per row
- `useQuery(['admin-tickets'], adminApi.getTickets)` (called unconditionally)

**FAQ tab**:
- Table: Question | Category | Published | Sort | Actions
- "Thêm FAQ" button → create modal
- Edit/Delete per row
- Toggle published inline
- `useQuery(['admin-faq'], adminApi.getAllFaq)` (called unconditionally)

### Updates to `admin-api.ts`

```typescript
// Ticket types
type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketCategory = 'ORDER' | 'PRODUCT' | 'SHIPPING' | 'PAYMENT' | 'RETURN' | 'OTHER';
interface AdminTicket { id, subject, category, status, createdAt, order: { orderNumber } | null, user: { email, firstName, lastName }, messages: [{ content, createdAt, isAdmin }], _count: { messages } }

getTickets(status?: string) → AdminTicket[]
updateTicketStatus(id, status) → AdminTicket
addTicketMessage(id, content) → TicketMessage

// FAQ types
interface FAQ { id, question, answer, category, sortOrder, isPublished, createdAt }
getAllFaq() → FAQ[]
createFaq(data) → FAQ
updateFaq(id, data) → FAQ
deleteFaq(id) → void
```

---

## Implementation Order

```
Task 1: Schema migration (new enums + models + User relation)
Task 2: SupportModule backend — tickets (customer + admin endpoints)
Task 3: FAQ backend (public + admin endpoints) — inside SupportModule
Task 4: Chatbot backend — ChatbotService + POST /support/chat
Task 5: mfe-profile support pages (ticket list, ticket detail, FAQ page, sidebar update)
Task 6: mfe-admin support tabs (tickets tab + FAQ tab + admin-api.ts updates)
Task 7: Chat widget in mfe-catalog (floating chat panel on product detail page)
```

---

## File Change Summary

### Backend
- `packages/database/prisma/schema.prisma` — 2 new enums, 3 new models, User relation additions
- `apps/api/src/modules/support/` — new module (7 files)
- `apps/api/src/modules/admin/admin.controller.ts` — add ticket + FAQ admin endpoints
- `apps/api/src/modules/admin/admin.service.ts` — add ticket + FAQ admin methods
- `apps/api/src/modules/admin/admin.module.ts` — import SupportModule
- `apps/api/src/app.module.ts` — import SupportModule

### Frontend
- `apps/mfe-profile/src/app/support/page.tsx` — ticket list + create modal (new)
- `apps/mfe-profile/src/app/support/[id]/page.tsx` — ticket detail + message thread (new)
- `apps/mfe-profile/src/app/support/faq/page.tsx` — FAQ page (new)
- `apps/mfe-profile/src/lib/support-api.ts` — API client (new)
- `apps/mfe-profile/src/components/account-sidebar.tsx` — add Hỗ trợ nav item
- `apps/mfe-admin/src/app/admin/page.tsx` — add tickets + faq tabs
- `apps/mfe-admin/src/lib/admin-api.ts` — add ticket + faq methods
- `apps/mfe-catalog/src/components/chat-widget.tsx` — floating chat widget (new)
- `apps/mfe-catalog/src/app/products/[slug]/page.tsx` — embed ChatWidget

---

## Out of Scope

- Real-time WebSocket live chat (would require Socket.IO infrastructure)
- AI-powered chatbot (Claude API integration — swap in later when API key available)
- Email notifications for ticket responses (no email service configured)
- File attachments in tickets
- CSAT (customer satisfaction) surveys
- SLA tracking / ticket priority queues
