# Shipping & Logistics — Design Spec

**Date:** 2026-04-20
**Project:** Lishop (Vietnamese e-commerce platform)
**Scope:** 4 clusters — shipping fees, order tracking, inventory, returns

---

## Baseline (what already exists)

- `Order`: `shippingFeeVnd` (hardcoded 30 000 ₫), `trackingNumber` (never populated), `status`
- `Shipment`: `provider` (String), `trackingNumber`, `estimatedAt`, `shippedAt`, `deliveredAt` — model exists but **never created**
- `Product`: `stock` — field exists but **never decremented on order**
- Admin: can update order status directly with no side-effects (no notifications, no stock changes)
- mfe-checkout: empty stub (`<h1>mfe-checkout</h1>`)

---

## Schema Changes

### New enums

```prisma
enum ShippingProvider {
  GHN
  GHTK
  VIETTEL_POST
}

enum ReturnStatus {
  PENDING
  APPROVED
  REJECTED
  RECEIVED
  COMPLETED
}

enum ReturnReason {
  DAMAGED
  WRONG_ITEM
  NOT_AS_DESCRIBED
  CHANGED_MIND
  OTHER
}

enum StockMovementType {
  ORDER_PLACED
  ORDER_CANCELLED
  RETURN_COMPLETED
  ADMIN_ADJUSTMENT
}
```

### Modified models

```prisma
// Order — add provider field
model Order {
  ...
  shippingProvider ShippingProvider @default(GHN)
  returnRequest    ReturnRequest?
}

// Product — add weight + relations
model Product {
  ...
  weightGrams    Int             @default(500)
  stockMovements StockMovement[]
}

// Shipment — add events relation
model Shipment {
  ...
  events ShipmentEvent[]
}

// User — add returns relation
model User {
  ...
  returnRequests ReturnRequest[]
}
```

### New models

```prisma
model ShipmentEvent {
  id          String   @id @default(uuid())
  shipmentId  String
  status      String   // CREATED | PICKED_UP | IN_TRANSIT | ARRIVED | DELIVERED | FAILED
  location    String?
  description String
  createdAt   DateTime @default(now())
  shipment    Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)

  @@index([shipmentId])
}

model StockMovement {
  id           String            @id @default(uuid())
  productId    String
  type         StockMovementType
  delta        Int               // positive = stock in, negative = stock out
  balanceAfter Int
  referenceId  String?           // orderId or returnRequestId
  note         String?
  createdAt    DateTime          @default(now())
  product      Product           @relation(fields: [productId], references: [id])

  @@index([productId])
  @@index([createdAt])
}

model ReturnRequest {
  id          String       @id @default(uuid())
  orderId     String       @unique   // one return per order
  userId      String
  status      ReturnStatus @default(PENDING)
  reason      ReturnReason
  description String?
  adminNote   String?
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  order       Order        @relation(fields: [orderId], references: [id])
  user        User         @relation(fields: [userId], references: [id])
  items       ReturnItem[]

  @@index([userId])
  @@index([status])
}

model ReturnItem {
  id              String        @id @default(uuid())
  returnRequestId String
  orderItemId     String
  quantity        Int
  returnRequest   ReturnRequest @relation(fields: [returnRequestId], references: [id], onDelete: Cascade)

  @@index([returnRequestId])
}
```

---

## Cluster 1 — Shipping Fee Calculation

### 1.1 Backend — ShippingModule

New module: `apps/api/src/modules/shipping/`

**Fee calculation logic (mock providers, realistic Vietnamese pricing):**

Province zones:
- Zone 1 (Hà Nội, Hồ Chí Minh): base fee
- Zone 2 (adjacent provinces): base + 5 000 ₫
- Zone 3 (other provinces): base + 15 000 ₫

| Provider | Base (Zone 1) | Per 500 g |
|---|---|---|
| GHN | 22 000 | 3 000 |
| GHTK | 20 000 | 2 500 |
| VIETTEL_POST | 18 000 | 2 000 |

Estimated delivery days: GHN 1-2d, GHTK 2-3d, Viettel Post 2-4d

**Endpoint:** `GET /shipping/rates?cityName=Hồ Chí Minh&weightGrams=500`
- `@Public()` — no auth needed
- Returns `ShippingOption[]`: `{ provider, name, feeVnd, estimatedDays }`

**Service:** `ShippingService.calculateRates(cityName, weightGrams): ShippingOption[]`

### 1.2 Updated PlaceOrderDto

```typescript
shippingProvider: ShippingProvider  // GHN | GHTK | VIETTEL_POST (default: GHN)
```

### 1.3 Updated OrdersService.placeOrder

1. Calls `shippingService.calculateFee(address.city, totalWeightGrams, provider)` for dynamic fee
2. Creates `Shipment` record (in same transaction) with initial ShipmentEvent "CREATED"
3. Decrements `product.stock` for each order item (atomically in transaction)
4. If any product has insufficient stock → throw `ConflictException` before creating order
5. Logs `StockMovement` for each item (type=ORDER_PLACED)
6. Fires low-stock notification if stock after decrement ≤ 5 (fire-and-forget, to admin user)

### 1.4 Frontend — mfe-checkout (build from stub)

Full checkout flow at `app/checkout/page.tsx`:

**Step 1 — Cart review**: Shows cart items, subtotal
**Step 2 — Address + Provider**: Address selector (existing addresses) + 3 shipping option cards with live fee display (fetch from `/shipping/rates?cityName=...&weightGrams=...`)
**Step 3 — Payment**: Payment method selector + place order button

```
GET /users/addresses    → address list
GET /shipping/rates?... → ShippingOption[] (re-fetches when address changes)
POST /orders            → place order (includes shippingProvider)
```

On success: redirect to `http://localhost:3005/orders` (mfe-orders)

---

## Cluster 2 — Order Tracking

### 2.1 Backend — Tracking Endpoints

**Customer:**
`GET /orders/:id/tracking` (auth required, ownership enforced)
→ Returns `{ shipment: { provider, trackingNumber, estimatedAt }, events: ShipmentEvent[] }`

**Admin:**
`POST /admin/orders/:id/tracking` (admin only)
Body: `{ status: string, location?: string, description: string }`
→ Creates ShipmentEvent, also updates `Shipment.shippedAt` when status=SHIPPED, `Shipment.deliveredAt` + `Order.status=DELIVERED` when status=DELIVERED
→ Fires customer notification

ShipmentEvent status values: `CREATED` | `PICKED_UP` | `IN_TRANSIT` | `ARRIVED` | `DELIVERED` | `FAILED`

Also update `PATCH /admin/orders/:id/status` to fire notification on every status change.

### 2.2 Frontend — Order Detail Tracking Section

In `mfe-orders/src/app/orders/[id]/page.tsx`, add below the existing status timeline:

**Shipment Info card**: provider name + tracking number (if assigned) + estimated delivery date

**Tracking Events timeline**: Vertical list of ShipmentEvent items, newest first.
Each event: icon + status label + location (if present) + description + timestamp.

Fetched via `GET /orders/:id/tracking` with `useQuery(['tracking', id])`.

---

## Cluster 3 — Inventory Management

### 3.1 Backend — InventoryModule

New module: `apps/api/src/modules/inventory/`

**Endpoints (all admin-only):**

| Method | Path | Description |
|---|---|---|
| GET | /admin/inventory | Product list with stock levels + last movement |
| POST | /admin/inventory/:productId/adjust | Manual stock adjustment |
| GET | /admin/inventory/:productId/movements | Movement history (last 50) |

`GET /admin/inventory` response:
```typescript
{
  id, name, slug, stock, weightGrams,
  lastMovement: { type, delta, createdAt } | null
}[]
```

`POST /admin/inventory/:productId/adjust` body:
```typescript
{ delta: number, note?: string }  // positive = add stock, negative = remove
```
- Creates `StockMovement` (type=ADMIN_ADJUSTMENT)
- Updates `Product.stock` atomically

### 3.2 Frontend — Admin Inventory Tab

Add "Kho hàng" tab to mfe-admin `app/admin/page.tsx`:
- Table: product name | stock level (red if ≤5, amber if ≤20) | weight | last movement
- "Điều chỉnh" button → modal with delta input + note
- Search/filter by name

---

## Cluster 4 — Returns

### 4.1 Backend — ReturnsModule

New module: `apps/api/src/modules/returns/`

**Customer endpoints (auth required):**

| Method | Path | Description |
|---|---|---|
| POST | /returns | Create return request |
| GET | /returns | My return requests |
| GET | /returns/:id | Single return detail |

`POST /returns` body:
```typescript
{
  orderId: string         // must be DELIVERED, owned by user
  reason: ReturnReason
  description?: string   // max 500
  items: { orderItemId: string, quantity: number }[]
}
```
- Validates: order is DELIVERED, order belongs to user, delivered within 7 days
- Validates: no existing non-REJECTED return for this order
- `quantity` ≤ original order item quantity
- Creates ReturnRequest + ReturnItems

**Admin endpoints:**

| Method | Path | Description |
|---|---|---|
| GET | /admin/returns | All return requests (paginated) |
| PATCH | /admin/returns/:id/status | Update status |

`PATCH /admin/returns/:id/status` body:
```typescript
{ status: 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED', adminNote?: string }
```

On `COMPLETED`:
- Restore stock: `product.stock += quantity` for each ReturnItem
- Log StockMovement (type=RETURN_COMPLETED)
- Update Order.status to REFUNDED
- Update Payment.status to REFUNDED
- Fire customer notification: "Yêu cầu đổi trả đã được xử lý"

On `APPROVED`:
- Fire customer notification: "Yêu cầu đổi trả đã được chấp nhận, vui lòng gửi hàng về"

On `REJECTED`:
- Fire customer notification with adminNote

### 4.2 Frontend — Returns in mfe-orders

**Order detail page** — add below the address card:
- If order.status === 'DELIVERED' and within 7 days: show "Yêu cầu đổi trả" button
- If return request exists for this order: show return status badge + details card

**Return modal**: Reason dropdown + description textarea + item quantity selectors

**Return status display**: PENDING→amber, APPROVED→blue, REJECTED→red, RECEIVED→violet, COMPLETED→emerald

### 4.3 Frontend — Admin Returns Tab

Add "Đổi trả" tab to mfe-admin:
- Table: return # | customer | order # | reason | status | date | action
- "Xem chi tiết" → drawer/modal showing items + customer description
- Status update dropdown (APPROVED / REJECTED / RECEIVED / COMPLETED) + adminNote textarea

---

## Implementation Order (dependency graph)

```
Task 1: Schema migration (all new models + enums)
Task 2: ShippingModule backend + mfe-checkout frontend
Task 3: Inventory backend (stock decrement in orders + InventoryModule)
Task 4: Tracking backend + order detail tracking section
Task 5: Returns backend (ReturnsModule)
Task 6: Returns frontend (mfe-orders + mfe-admin returns tab)
Task 7: Admin enhancements (inventory tab + tracking event tab in mfe-admin)
```

---

## File Change Summary

### Backend (`lishop-backend`)
- `packages/database/prisma/schema.prisma` — 4 new enums, 4 new models, 4 model modifications
- `apps/api/src/modules/shipping/` — new module (shipping.service, shipping.controller, shipping.module)
- `apps/api/src/modules/inventory/` — new module (inventory.repository, inventory.service, inventory.controller, inventory.module)
- `apps/api/src/modules/returns/` — new module (returns.repository, returns.service, returns.controller, returns.module, dto/)
- `apps/api/src/modules/orders/orders.service.ts` — dynamic fee, stock decrement, shipment creation
- `apps/api/src/modules/orders/orders.repository.ts` — transaction update, tracking endpoint
- `apps/api/src/modules/orders/orders.controller.ts` — add GET /:id/tracking
- `apps/api/src/modules/orders/dto/place-order.dto.ts` — add shippingProvider
- `apps/api/src/modules/admin/admin.controller.ts` — add POST /:id/tracking, inventory, returns endpoints
- `apps/api/src/modules/admin/admin.service.ts` — add tracking, inventory, returns methods
- `apps/api/src/app.module.ts` — import ShippingModule, InventoryModule, ReturnsModule

### Frontend (`lishop-frontend`)
- `apps/mfe-checkout/src/app/checkout/page.tsx` — full checkout flow (new)
- `apps/mfe-checkout/src/lib/checkout-api.ts` — API client (new)
- `apps/mfe-orders/src/app/orders/[id]/page.tsx` — tracking section + return button
- `apps/mfe-orders/src/lib/orders-api.ts` — add tracking + return types
- `apps/mfe-orders/src/lib/returns-api.ts` — returns API client (new)
- `apps/mfe-admin/src/app/admin/page.tsx` — add inventory + returns + tracking tabs
- `apps/mfe-admin/src/lib/admin-api.ts` — add inventory + returns + tracking types

---

## Out of Scope

- Real GHN / GHTK / Viettel Post API HTTP calls (mock logic only — swap in real calls when you have API keys)
- Shipping webhook receivers (provider calls our URL on delivery update)
- Multi-warehouse / zone-based routing
- Partial returns (the model supports it via ReturnItem.quantity but UI is simplified)
- Return shipping labels / QR codes
- Automated refund via payment gateway
