# 💳 Lishop — Luồng xử lý thanh toán

> Backend: `payments.controller.ts` → `payments.service.ts` → `payments.gateway.ts`  
> Frontend: `mfe-checkout` (port 3004)  
> CSDL: `Payment` (1-1 với `Order`), `Wallet`, `WalletTransaction`

---

## 1. Cấu trúc file

| File | Vai trò |
|---|---|
| `payments.controller.ts` | REST endpoints (public + auth), nhận request từ frontend + callback từ gateway |
| `payments.service.ts` | Logic nghiệp vụ: khởi tạo thanh toán, xử lý return/callback, mock |
| `payments.gateway.ts` | Tích hợp cổng thanh toán: tạo URL, ký HMAC, verify chữ ký |
| `payments.repository.ts` | CRUD với DB |

---

## 2. PaymentMethod enum (7 phương thức)

```
STRIPE, PAYPAL, VNPAY, MOMO, ZALOPAY, WALLET, COD
```

---

## 3. COD (Cash on Delivery)

**Cách hoạt động:**
- User chọn COD → đặt hàng → Backend tạo `Payment { method: COD, status: PENDING }`
- `initiatePayment()` trả về `{ paymentUrl: null, status: "PENDING" }` → không redirect
- **Admin** vào `/admin/payments` → tìm đơn hàng → bấm "Xác nhận thanh toán"
  → `PATCH /admin/payments/:orderId/confirm`
  → `Payment.status = COMPLETED`, `Order.status = PROCESSING`

**Luồng:** Đặt hàng → chờ giao hàng + thu tiền → admin confirm → hoàn tất

**Tài liệu tham khảo:**
- `payments.service.ts :: initiatePayment()` — dòng kiểm tra `COD || WALLET` trả null
- `payments.service.ts :: confirmPaymentAdmin()` — update status
- `admin.controller.ts :: confirmPayment()` — endpoint admin

---

## 4. Wallet (Ví nội bộ)

**Cách hoạt động:**
- User chọn Wallet khi đặt hàng
- `OrdersService.placeOrder()` gọi `walletService.deductForOrder(userId, orderId, totalVnd)`
  - Nếu số dư không đủ → throw error → `cancelOrder(orderId)`
  - Nếu đủ → trừ `Wallet.balanceVnd` + tạo `WalletTransaction { type: PAYMENT }`
- `initiatePayment()` trả về `{ paymentUrl: null, status: "PENDING" }` → không redirect
- **Hiện tại**: cần admin confirm giống COD

**Lưu ý:** Đã trừ tiền nhưng chưa tự set Payment.COMPLETED. Cần cải thiện trong tương lai.

**Tài liệu tham khảo:**
- `orders.service.ts :: placeOrder()` — xử lý `PaymentMethod.WALLET`
- `wallet.service.ts :: deductForOrder()`

---

## 5. VNPAY

**Cách hoạt động:**

### Tạo URL thanh toán
- `initiatePayment()` gọi `gateway.generateVNPayUrl(orderId, amountVnd, orderInfo, clientIp)`
- Build params:
  - `vnp_Version = 2.1.0`
  - `vnp_TmnCode` = từ env `VNPAY_TMN_CODE` (mặc định `DEMO`)
  - `vnp_Amount` = `amountVnd * 100` (VND × 100)
  - `vnp_TxnRef` = UUID bỏ dash (32 ký tự hex)
  - `vnp_ReturnUrl` = từ env
  - `vnp_CreateDate` + `vnp_ExpireDate` (15 phút)
- Sort params alphabetically → build chuỗi → HMAC-SHA512 với `VNPAY_HASH_SECRET`
- Trả về URL: `{vnpUrl}?{params}&vnp_SecureHash={signature}`

### DEMO vs Production
- **DEMO**: Nếu `VNPAY_TMN_CODE === 'DEMO'` hoặc `VNPAY_HASH_SECRET === 'DEMO_SECRET'`
  → redirect đến `payment-simulator?method=VNPAY&orderId=...`
- **Production**: Redirect đến `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...`

### Xử lý return callback
- VNPAY redirect user về `GET /payments/vnpay/return?{query}`
- Backend:
  1. Loại bỏ `vnp_SecureHash` và `vnp_SecureHashType` khỏi query
  2. Sort params còn lại → HMAC-SHA512 → so sánh với `vnp_SecureHash`
  3. Nếu hợp lệ AND `vnp_ResponseCode === '00'`:
     - `$transaction([Payment → COMPLETED, Order → PROCESSING])`
  4. Redirect về `/checkout/payment-result?success=true&orderId=...`

**Luồng:** Frontend → redirect VNPAY → user nhập thẻ → VNPAY redirect về backend → backend verify + update DB → redirect về frontend

**Env vars:**
```
VNPAY_TMN_CODE=DEMO
VNPAY_HASH_SECRET=DEMO_SECRET
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3004/checkout/payment-result
```

**Tài liệu tham khảo:**
- `payments.gateway.ts :: generateVNPayUrl()` — tạo URL + ký
- `payments.gateway.ts :: verifyVNPayReturn()` — verify chữ ký
- `payments.service.ts :: handleVNPayReturn()` — update DB

---

## 6. MoMo

**Cách hoạt động:**

### Tạo URL thanh toán
- `initiatePayment()` gọi `gateway.generateMoMoUrl(orderId, amountVnd)`
- Tạo `requestId = orderId + "-" + Date.now()`
- Build raw signature:
  ```
  accessKey={accessKey}&amount={amountVnd}&extraData=&ipnUrl={ipnUrl}&orderId={requestId}&orderInfo=...&partnerCode={partnerCode}&redirectUrl={returnUrl}&requestId={requestId}&requestType=payWithMethod
  ```
- HMAC-SHA256 với `MOMO_SECRET_KEY`
- POST JSON đến MoMo endpoint → nhận `payUrl`

### DEMO vs Production
- **DEMO**: Nếu `MOMO_PARTNER_CODE === 'MOMO_DEMO'`
  → redirect đến `payment-simulator?method=MOMO&orderId=...`
- **Production**: POST đến MoMo API → nhận `payUrl` → redirect user

### Xử lý IPN (server-to-server)
- MoMo gọi `POST /payments/momo/ipn` với body chứa `resultCode`, chữ ký, ...
- Backend:
  1. Build raw signature từ các field trong body
  2. HMAC-SHA256 → so sánh với `signature` từ MoMo
  3. Nếu hợp lệ AND `resultCode === 0`:
     - Parse `orderId` từ `requestId` (cắt bỏ `-timestamp`)
     - `$transaction([Payment → COMPLETED, Order → PROCESSING])`

### Xử lý redirect
- MoMo redirect user về `MOMO_RETURN_URL` (`/checkout/payment-result`)
- Frontend show kết quả (dựa vào query params)

**Luồng:** Frontend → redirect MoMo → user nhập OTP → MoMo redirect về frontend (client) + MoMo gọi IPN (server) → backend update DB

**Lưu ý:** MoMo có **2 luồng song song**:
- Client redirect → frontend show UI
- Server IPN → backend update DB (ưu tiên hơn)

**Env vars:**
```
MOMO_PARTNER_CODE=MOMO_DEMO
MOMO_ACCESS_KEY=DEMO_ACCESS
MOMO_SECRET_KEY=DEMO_SECRET
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_IPN_URL=http://localhost:4000/payments/momo/ipn
MOMO_RETURN_URL=http://localhost:3004/checkout/payment-result
```

**Tài liệu tham khảo:**
- `payments.gateway.ts :: generateMoMoUrl()` — tạo URL + ký
- `payments.gateway.ts :: verifyMoMoIpn()` — verify IPN signature
- `payments.service.ts :: handleMoMoIpn()` — update DB từ IPN

---

## 7. ZaloPay

**Cách hoạt động:**

### Tạo URL thanh toán
- `initiatePayment()` gọi `gateway.generateZaloPayUrl(orderId, amountVnd)`
- Build `appTransId = YYMMDD_{8ký tự đầu orderId}`
- Build chuỗi ký:
  ```
  {appId}|{appTransId}|{orderId}|{amountVnd}|{appTime}|{embedData}|{items}
  ```
- HMAC-SHA256 với `ZALOPAY_KEY1` → `mac`
- POST JSON đến ZaloPay endpoint → nhận `orderUrl`

### DEMO vs Production
- **DEMO**: Nếu `ZALOPAY_APP_ID === '2554'` (sandbox mặc định)
  → redirect đến `payment-simulator?method=ZALOPAY&orderId=...`
- **Production**: POST đến ZaloPay API → nhận `orderUrl` → redirect user

### Xử lý callback (server-to-server)
- ZaloPay gọi `POST /payments/zalopay/callback` với `{ data: string, mac: string }`
- Backend:
  1. HMAC-SHA256 `data` với `ZALOPAY_KEY2` → so sánh với `mac`
  2. Parse `data` (JSON string) → lấy `app_user` = orderId
  3. Nếu hợp lệ:
     - `$transaction([Payment → COMPLETED, Order → PROCESSING])`

**Luồng:** Frontend → redirect ZaloPay → user thanh toán trong ZaloPay app → ZaloPay gọi callback (server) → backend update DB

**Lưu ý:** ZaloPay **không redirect user** về frontend (user ở lại ZaloPay). Backend chỉ nhận callback server-to-server.

**Env vars:**
```
ZALOPAY_APP_ID=2554
ZALOPAY_KEY1=sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn
ZALOPAY_KEY2=trMrHtvjo6myautxDUiAcYsVtaeQ8nhf
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:4000/payments/zalopay/callback
ZALOPAY_RETURN_URL=http://localhost:3004/checkout/payment-result
```

**Tài liệu tham khảo:**
- `payments.gateway.ts :: generateZaloPayUrl()` — tạo URL + ký
- `payments.gateway.ts :: verifyZaloPayCallback()` — verify callback signature
- `payments.service.ts :: handleZaloPayCallback()` — update DB

---

## 8. Stripe & PayPal

**Hiện tại chưa có implementation cụ thể.**

`PaymentMethod` enum đã khai báo `STRIPE` và `PAYPAL`, nhưng trong `initiatePayment()`:

```typescript
// payments.service.ts :: initiatePayment()
} else {
  paymentUrl = `https://payment.example.com/pay?ref=${orderId}`;
}
```

→ fallback đến URL mặc định. Cần implement thêm gateway methods trong `payments.gateway.ts` khi có nhu cầu.

---

## 9. Mock Payment Simulator

Khi dùng **DEMO credentials**, cả 3 cổng đều redirect đến:

```
http://localhost:3004/checkout/payment-simulator?orderId=<uuid>&method=<METHOD>
```

### Giao diện (mfe-checkout)
| Nút | Hành động |
|---|---|
| "Thanh toán thành công" | Redirect → `GET /payments/mock/return?orderId=...&success=true` |
| "Thanh toán thất bại" | Redirect → `GET /payments/mock/return?orderId=...&success=false` |

### Backend xử lý

**Endpoint:** `GET /payments/mock/return`
- `handleMockPayment(orderId, success)`
  - Nếu `success = true`:
    - `$transaction([Payment → COMPLETED, Order → PROCESSING])`
    - Gán `providerRef = mock_{timestamp}`
  - Nếu `success = false`:
    - `Payment.status = FAILED`
    - Gán `providerRef = mock_failed_{timestamp}`
- Redirect → `/checkout/payment-result?success=true|false&orderId=...`

**Endpoint:** `POST /payments/mock/webhook`
- Dùng cho E2E tests hoặc API clients
- Body: `{ orderId, success?, providerRef? }`
- Xử lý tương tự mock/return nhưng không redirect

**Tài liệu tham khảo:**
- `payments.controller.ts :: mockReturn()` — GET endpoint
- `payments.controller.ts :: mockWebhook()` — POST endpoint
- `payments.service.ts :: handleMockPayment()` — xử lý chính

---

## 10. Admin operations

| Endpoint | Mô tả | Khi nào cần |
|---|---|---|
| `GET /admin/payments` | Danh sách tất cả payments kèm thông tin user + order | Quản lý, đối soát |
| `PATCH /admin/payments/:orderId/confirm` | Set `Payment → COMPLETED` + nếu COD thì `Order → PROCESSING` | COD + các TH cần confirm thủ công |
| `POST /admin/refunds/:id/process` | Xử lý refund (hoàn tiền qua wallet hoặc cổng) | Khi có yêu cầu hoàn tiền |

---

## 11. Payment status lifecycle

```
PENDING ──→ COMPLETED ──→ REFUNDED
    │
    └────→ FAILED
```

Giải thích:
- **PENDING**: Vừa tạo, chờ thanh toán
- **COMPLETED**: Thanh toán thành công (từ gateway callback / admin confirm)
- **FAILED**: Thanh toán thất bại (từ gateway / mock)
- **REFUNDED**: Đã hoàn tiền (từ admin process refund)
