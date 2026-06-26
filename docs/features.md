# 📋 Lishop — Danh sách chức năng toàn bộ ứng dụng

> **Kiến trúc**: Backend NestJS monorepo (Turbo) + Frontend Micro-Frontends (Next.js 15 + Module Federation)
>
> **CSDL**: PostgreSQL (Prisma ORM) · **Queue/Cache**: Redis (BullMQ) · **Search**: MeiliSearch
>
> **Ngôn ngữ**: TypeScript toàn bộ

---

## 1. 🔐 Authentication & Authorization

| Chức năng | API | Frontend MFE | Ghi chú |
|---|---|---|---|
| Đăng ký (email + password) | `POST /auth/register` | mfe-auth (`/register`) | |
| Đăng nhập (email + password) | `POST /auth/login` | mfe-auth (`/login`) | Trả về httpOnly cookie (`lishop_at`) + JS-readable session cookie (`lishop_session`) |
| Đăng xuất (revoke token) | `POST /auth/logout` | mfe-auth | Xoá cookie + blacklist JWT trong Redis |
| Refresh token | `POST /auth/refresh` | Built-in | Dùng httpOnly cookie `refresh_token` (7 ngày) |
| Lấy thông tin user hiện tại | `GET /auth/me` | — | Trả về hồ sơ + số dư wallet |
| Google OAuth | `GET /auth/oauth/google/*` | mfe-auth | Cần `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` |
| Facebook OAuth | `GET /auth/oauth/facebook/*` | mfe-auth | Cần `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` |
| Xác thực email | `POST /auth/verify-email` | mfe-auth (`/verify-email`) | Gửi email chứa token |
| Quên mật khẩu | `POST /auth/forgot-password` | mfe-auth (`/forgot-password`) | Gửi email reset link |
| Đặt lại mật khẩu | `POST /auth/reset-password` | mfe-auth (`/reset-password`) | Dùng token từ email |

**Lưu ý**: 
- JWT access token để ở httpOnly cookie (`lishop_at`, 15 phút), refresh token ở cookie riêng (`refresh_token`, 7 ngày)
- Có cookie `lishop_session` (non-httpOnly) để JS frontend biết user đã đăng nhập
- Cần env: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`

---

## 2. 👤 User Management

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Xem/Sửa hồ sơ | `GET/PUT /users/:id` | mfe-profile (`/profile`) | |
| Đổi mật khẩu | `PATCH /users/:id/password` | mfe-profile | |
| Đăng ký thành Seller | `POST /users/become-seller` | mfe-auth (`/become-seller`) | Tạo request, admin duyệt |

---

## 3. 📍 Addresses (Quản lý địa chỉ)

| Chức năng | API | MFE |
|---|---|---|
| Danh sách địa chỉ | `GET /addresses` | mfe-profile (`/addresses`) |
| Thêm địa chỉ | `POST /addresses` | mfe-profile |
| Sửa địa chỉ | `PATCH /addresses/:id` | mfe-profile |
| Xoá địa chỉ | `DELETE /addresses/:id` | mfe-profile |
| Đặt mặc định | `PATCH /addresses/:id/default` | mfe-profile |

---

## 4. 🏪 Shops (Hệ thống người bán)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Đăng ký shop | `POST /shops` | mfe-auth (`/become-seller`) | Trạng thái `PENDING` chờ duyệt |
| Xem shop công khai | `GET /shops/:slug` | mfe-catalog (`/shops/[slug]`) | |
| Danh sách sản phẩm của shop | `GET /shops/:slug/products` | mfe-catalog | |
| **Admin**: Duyệt/Từ chối shop | `PATCH /admin/shops/:id/approve\|reject` | mfe-admin (`/admin/shops`) | Cần env: không có env đặc biệt |

**Lưu ý**: Shop cần được admin duyệt mới active, có 3 trạng thái: `PENDING` → `APPROVED` / `REJECTED`

---

## 5. 🏷️ Categories (Danh mục sản phẩm)

| Chức năng | API | Ghi chú |
|---|---|---|
| Danh sách danh mục (cây) | `GET /categories` | Hỗ trợ danh mục cha-con |
| Chi tiết danh mục | `GET /categories/:slug` | |
| Sản phẩm theo danh mục | `GET /categories/:slug/products` | |

---

## 6. 📦 Products (Sản phẩm)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Danh sách sản phẩm (bộ lọc + phân trang cursor) | `GET /products` | mfe-catalog (`/products`) | Query params: `category`, `minPrice`, `maxPrice`, `q` (search), `cursor`, `limit`, `sortBy` (price_asc/price_desc/newest/popular) |
| Sản phẩm nổi bật | `GET /products/featured` | Shell (homepage) | 8 sản phẩm mới nhất còn hàng |
| Chi tiết sản phẩm | `GET /products/:slug` | mfe-catalog (`/products/[slug]`) | |
| Sản phẩm liên quan | `GET /products/:slug/related` | mfe-catalog | Theo category + tags |
| Gợi ý cá nhân hoá | `GET /products/recommendations` | mfe-catalog | Hỗ trợ context-based recommendations |
| AI Product Discovery | `POST /products/ai-discovery` | — | Tìm sản phẩm bằng ngôn ngữ tự nhiên qua GPT |
| **Admin**: CRUD sản phẩm | `POST/PATCH/DELETE /products/:id` | mfe-admin (`/admin/products`) | |
| **Admin**: Import hàng loạt | `POST /admin/products/import` | mfe-admin | |
| **Admin**: AI copy cho sản phẩm | `POST /admin/products/ai-copy` | mfe-admin | Dùng GPT sinh mô tả |
| **Admin**: AI import & enrich | `POST /admin/products/ai-import-enrich` | mfe-admin | Từ CSV/JSON/text thô |
| **Admin**: AI sinh ảnh sản phẩm | `POST /admin/products/:id/ai-generate-image` | mfe-admin | Dùng Unsplash API (cần `UNSPLASH_ACCESS_KEY`) |

**Lưu ý**: 
- Sản phẩm có biến thể (ProductVariant) — size, màu sắc, giá riêng, tồn kho riêng
- Có tags, images, slug tự động từ tên
- MeiliSearch có trong docker-compose nhưng chưa rõ đã tích hợp search qua MeiliSearch chưa — frontend search hiện tại dùng query param `q` (có thể dùng PostgreSQL ILIKE hoặc MeiliSearch)

---

## 7. 🛒 Cart (Giỏ hàng)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Xem giỏ hàng | `GET /cart` | mfe-cart (`/cart`) | |
| Thêm vào giỏ | `POST /cart` | mfe-cart | Hỗ trợ variant |
| Cập nhật số lượng | `PATCH /cart/:id` | mfe-cart | |
| Xoá khỏi giỏ | `DELETE /cart/:id` | mfe-cart | |
| Xoá toàn bộ giỏ | `DELETE /cart` | mfe-cart | |

**Lưu ý**: Mỗi user chỉ có 1 entry cho mỗi `(userId, productId, variantId)` — unique constraint

---

## 8. ❤️ Wishlist (Yêu thích)

| Chức năng | API | MFE |
|---|---|---|
| Danh sách yêu thích | `GET /wishlist` | mfe-profile (`/wishlist`) |
| Thêm/Yêu thích | `POST /wishlist` | mfe-profile |
| Xoá/Bỏ yêu thích | `DELETE /wishlist/:productId` | mfe-profile |

---

## 9. 📋 Orders (Đơn hàng)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Đặt hàng (từ giỏ) | `POST /orders` | mfe-checkout (`/checkout`) | Cần address + phương thức thanh toán |
| Danh sách đơn hàng của tôi | `GET /orders` | mfe-orders (`/orders`) | |
| Chi tiết đơn hàng | `GET /orders/:id` | mfe-orders (`/orders/[id]`) | |
| Theo dõi vận chuyển | `GET /orders/:id/tracking` | mfe-orders | |
| Huỷ đơn hàng | `PATCH /orders/:id/cancel` | mfe-orders | Chỉ huỷ được khi `PENDING` hoặc `PROCESSING` |
| Xác nhận đã nhận hàng | `PATCH /orders/:id/confirm-delivered` | mfe-orders | |
| **Seller**: Xem đơn hàng của shop | `GET /seller/orders` | mfe-seller (`/orders`) | |
| **Admin**: Quản lý đơn hàng | `GET /admin/orders` | mfe-admin (`/admin/orders`) | |
| **Admin**: Cập nhật trạng thái | `PATCH /admin/orders/:id/status` | mfe-admin | |
| **Admin**: Thêm tracking event | `POST /admin/orders/:id/tracking` | mfe-admin | |

**Lưu ý**: Order status flow: `PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`. Có thể `CANCELLED` hoặc `REFUNDED` bất cứ lúc nào.

---

## 10. 💳 Payments (Thanh toán)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Xem trạng thái thanh toán | `GET /payments/:orderId` | mfe-checkout | |
| Khởi tạo thanh toán | `POST /payments/:orderId/initiate` | mfe-checkout | Trả về URL redirect |
| VNPAY return callback | `GET /payments/vnpay/return` | — | |
| MoMo IPN callback | `POST /payments/momo/ipn` | — | Server-to-server |
| ZaloPay callback | `POST /payments/zalopay/callback` | — | Server-to-server |
| Mock payment (local dev) | `GET /payments/mock/return` + `POST /payments/mock/webhook` | mfe-checkout (`/checkout/payment-simulator`) | Dùng cho dev nếu thiếu credentials thật |
| Xác nhận thanh toán (admin) | `PATCH /admin/payments/:orderId/confirm` | mfe-admin (`/admin/payments`) | Đặc biệt cho COD |

**Các phương thức thanh toán hỗ trợ**: `COD`, `VNPAY`, `MOMO`, `ZALOPAY`, `STRIPE`, `PAYPAL`, `WALLET`

**Lưu ý env**:
- VNPAY: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL`, `VNPAY_RETURN_URL`
- MoMo: `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_ENDPOINT`, `MOMO_IPN_URL`, `MOMO_RETURN_URL`
- ZaloPay: `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2`, `ZALOPAY_ENDPOINT`, `ZALOPAY_CALLBACK_URL`, `ZALOPAY_RETURN_URL`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`

> Khi dùng credentials demo (`DEMO` / `MOMO_DEMO` / `2554`) → tự động chuyển qua mock payment simulator tại `/checkout/payment-simulator` (trong mfe-checkout)

---

## 11. 🚚 Shipping (Vận chuyển)

| Chức năng | API | Ghi chú |
|---|---|---|
| Tính phí vận chuyển | `GET /shipping/rates` | Query: `cityName`, `weightGrams` |

**Lưu ý**: 
- Hỗ trợ 4 providers: `GHN`, `GHTK`, `VIETTEL_POST`
- Dùng `GHN_TOKEN`, `GHTK_TOKEN` nếu cần real rates (hiện tại có vẻ mock rates dựa trên cityName + weight)
- Shipping provider lưu trong Order

---

## 12. ⭐ Reviews (Đánh giá)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Danh sách đánh giá sản phẩm | `GET /reviews/product/:productId` | mfe-catalog (`/products/[slug]`) | |
| Thêm đánh giá | `POST /reviews` | mfe-orders | Chỉ khi đã mua hàng |
| Xoá đánh giá | `DELETE /reviews/:id` | mfe-profile | |
| **Admin**: Duyệt/Từ chối đánh giá | `PATCH /admin/reviews/:id/status` | mfe-admin (`/admin/reviews`) | Review có chế độ kiểm duyệt: `PENDING` → `APPROVED` / `REJECTED` |
| **Admin**: AI moderation | `POST /admin/reviews/:id/ai-moderation` | mfe-admin | GPT gợi ý duyệt/từ chối |

**Lưu ý**: Mỗi user chỉ review 1 lần cho mỗi sản phẩm (`@@unique([productId, userId])`).

---

## 13. 🔄 Returns & Refunds (Trả hàng & Hoàn tiền)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Tạo yêu cầu trả hàng | `POST /returns` | mfe-profile (`/support`) | |
| Xem yêu cầu trả hàng của tôi | `GET /returns` | mfe-profile | |
| **Admin**: Danh sách yêu cầu | `GET /admin/returns` | mfe-admin (`/admin/returns`) | |
| **Admin**: Cập nhật trạng thái | `PATCH /admin/returns/:id/status` | mfe-admin | |
| **Admin**: AI hỗ trợ xử lý | `POST /admin/returns/:id/ai-assist` | mfe-admin | GPT gợi ý quyết định + note |
| **Admin**: Danh sách refunds | `GET /admin/refunds` | mfe-admin (`/admin/refunds`) | |
| **Admin**: Xử lý refund | `POST /admin/refunds/:id/process` | mfe-admin | |
| **Admin**: AI hỗ trợ refund | `POST /admin/refunds/:id/ai-assist` | mfe-admin | |

**Lưu ý**: Refund có thể qua `ORIGINAL_PAYMENT`, `WALLET`, hoặc `MANUAL`

---

## 14. 💰 Wallet (Ví điện tử nội bộ)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Xem số dư & lịch sử giao dịch | `GET /wallet` | mfe-profile (`/wallet`) | |
| Nạp tiền (chuyển khoản) | `POST /wallet/topup-request` | mfe-profile | Tạo request chờ admin duyệt |
| **Admin**: Danh sách ví | `GET /admin/wallets` | mfe-admin (`/admin/wallets`) | |
| **Admin**: Duyệt/Từ chối nạp tiền | `PATCH /admin/wallet-topups/:id/approve\|reject` | mfe-admin (`/admin/wallet-topups`) | |

**Lưu ý**: Wallet transactions có type: `TOPUP`, `PAYMENT`, `REFUND`, `WITHDRAW`, `POINTS_CONVERSION`. Nạp tiền qua chuyển khoản ngân hàng, admin duyệt thủ công.

---

## 15. 🎉 Promotions (Khuyến mãi)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Danh sách mã giảm giá khả dụng | `GET /promotions/coupons/available` | mfe-checkout | |
| Áp dụng mã giảm giá | `POST /promotions/coupons/apply` | mfe-checkout | Trả về số tiền giảm |
| Flash Sales đang diễn ra | `GET /promotions/flash-sales/active` | mfe-promotions (`/promotions`) | |
| **Admin**: CRUD coupons | `POST /admin/coupons`, `PATCH /admin/coupons/:id/toggle` | mfe-admin (`/admin/promotions`) | Coupon types: `PERCENT`, `FIXED`, `FREE_SHIPPING` |
| **Admin**: CRUD flash sales | `POST/DELETE /admin/flash-sales/*` | mfe-admin (`/admin/flashsales`) | |

---

## 16. 🔔 Notifications (Thông báo)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| Danh sách thông báo (phân trang) | `GET /notifications` | mfe-notifications (`/notifications`) | |
| SSE realtime stream | `GET /notifications/stream` | mfe-notifications | Server-Sent Events |
| Đánh dấu đã đọc | `PATCH /notifications/:id/read` | mfe-notifications | |
| Đánh dấu tất cả đã đọc | `PATCH /notifications/read-all` | mfe-notifications | |
| Cấu hình preferences | `GET/PUT /notifications/preferences/:eventType` | mfe-notifications | Từng event type: email/push/in-app |
| Device tokens (FCM push) | `POST /notifications/devices` | — | Cần `FCM_SERVICE_ACCOUNT_JSON` |

---

## 17. 🔌 Real-time (WebSocket — Socket.IO)

| Chức năng | Ghi chú |
|---|---|
| Kết nối WebSocket với JWT auth | Dùng cookie `lishop_at` hoặc Authorization header |
| Join/Leave room | Client có thể join room bất kỳ |
| Auto-join `user:{userId}` | Server tự động gán khi connect |
| Admin auto-join `admin` room | Broadcast đến tất cả admin |
| Gửi sự kiện realtime | Đơn hàng mới, thanh toán, thông báo... |

---

## 18. 📄 Invoices (Hoá đơn)

| Chức năng | API | MFE |
|---|---|---|
| Xem hoá đơn của tôi | `GET /invoices` | mfe-profile |
| Chi tiết hoá đơn | `GET /invoices/:id` | mfe-orders |
| **Admin**: Danh sách hoá đơn | `GET /admin/invoices` | mfe-admin (`/admin/invoices`) |
| **Admin**: Tạo hoá đơn | `POST /admin/invoices/:orderId/generate` | mfe-admin |

---

## 19. 📊 Inventory (Tồn kho)

| Chức năng | API | Ghi chú |
|---|---|---|
| Lịch sử biến động tồn kho | `GET /inventory/:productId/movements` | |
| **Admin**: Điều chỉnh tồn kho | `POST /inventory/:productId/adjust` | `ADMIN_ADJUSTMENT` type |

Stock movement types: `ORDER_PLACED`, `ORDER_CANCELLED`, `RETURN_COMPLETED`, `ADMIN_ADJUSTMENT`

---

## 20. 🎫 Support (Hỗ trợ)

| Chức năng | API | MFE | Ghi chú |
|---|---|---|---|
| FAQ công khai (theo category) | `GET /support/faq` | mfe-profile (`/support/faq`) | Chỉ published |
| Tìm kiếm FAQ | `GET /support/faq/search?q=` | mfe-profile | |
| AI Chatbot hỗ trợ mua sắm | `POST /support/chat` | Shell (AiChatWidget) | GPT-powered, public |
| Tạo ticket hỗ trợ | `POST /support/tickets` | mfe-profile (`/support`) | Có category (ORDER, PRODUCT, SHIPPING, PAYMENT, RETURN, OTHER) |
| Xem ticket của tôi | `GET /support/tickets` | mfe-profile | |
| Gửi tin nhắn trong ticket | `POST /support/tickets/:id/messages` | mfe-profile | Hỗ trợ upload media (base64 image, tối đa ~2MB) |
| Upload media cho ticket | `POST /support/uploads` | mfe-profile | |
| **Admin**: Quản lý tickets | `GET /admin/tickets` + `PATCH /admin/tickets/:id/status` | mfe-admin (`/admin/tickets`) | |
| **Admin**: Trả lời ticket | `POST /admin/tickets/:id/messages` | mfe-admin | Gắn mác `isAdmin: true` |
| **Admin**: AI hỗ trợ ticket | `POST /admin/tickets/:id/ai-assist` | mfe-admin | GPT sinh tóm tắt + draft reply |
| **Admin**: CRUD FAQ | `GET/POST/PATCH/DELETE /admin/faq` | mfe-admin (`/admin/faq`) | |
| **Admin**: AI sinh câu trả lời FAQ | `POST /admin/faq/ai-answer` | mfe-admin | |

**Lưu ý**: Ticket status: `OPEN` → `IN_PROGRESS` → `RESOLVED` → `CLOSED`

---

## 21. 🤖 AI Features (Tổng hợp)

Tất cả AI feature đều dùng OpenAI Responses API (model `gpt-5.2`, có thể cấu hình qua `OPENAI_MODEL`).

| Chức năng | Module | Ghi chú |
|---|---|---|
| Product Discovery | `POST /products/ai-discovery` | Tìm sản phẩm bằng ngôn ngữ tự nhiên |
| Product Recommendations | `GET /products/recommendations` | Gợi ý có context |
| Shopping Concierge | `POST /shopping/concierge` | Tư vấn mua sắm + lên kế hoạch giỏ hàng |
| Style & Fit Advisor | `POST /shopping/style-fit-advisor` | Tư vấn size/fit dựa trên chiều cao, cân nặng, body shape |
| Support Chatbot | `POST /support/chat` | Chatbot hỗ trợ khách hàng |
| AI Product Copy | `POST /admin/products/ai-copy` | Sinh mô tả sản phẩm |
| AI Import & Enrich | `POST /admin/products/ai-import-enrich` | Import thông minh từ dữ liệu thô |
| AI Product Image | `POST /admin/products/:id/ai-generate-image` | Search ảnh từ Unsplash (cần `UNSPLASH_ACCESS_KEY`) |
| AI Review Moderation | `POST /admin/reviews/:id/ai-moderation` | Gợi ý duyệt/từ chối review |
| AI Return Assist | `POST /admin/returns/:id/ai-assist` | Gợi ý xử lý return |
| AI Refund Assist | `POST /admin/refunds/:id/ai-assist` | Gợi ý xử lý refund |
| AI Ticket Assist | `POST /admin/tickets/:id/ai-assist` | Tóm tắt ticket + draft reply |
| AI FAQ Answer | `POST /admin/faq/ai-answer` | Sinh câu trả lời FAQ |
| AI Analytics Insights | `POST /admin/analytics/ai-insights` | Insights từ dữ liệu analytics |

**Cần env**: `OPENAI_API_KEY` (bắt buộc), `OPENAI_MODEL` (mặc định `gpt-5.2`), `UNSPLASH_ACCESS_KEY` (cho AI image)

---

## 22. 📊 Admin Dashboard

| Chức năng | API | MFE Route |
|---|---|---|
| Thống kê nền tảng | `GET /admin/stats` | `/admin` |
| Analytics (revenue + top products) | `GET /admin/analytics` | `/admin/analytics` |
| AI Insights từ analytics | `POST /admin/analytics/ai-insights` | `/admin/analytics` |
| Quản lý users | `GET /admin/users` + `PATCH /admin/users/:id/role` | `/admin/users` |
| Quản lý đơn hàng | `GET /admin/orders` + `PATCH .../status` + tracking | `/admin/orders` |
| Quản lý sản phẩm | Import, AI copy, AI image, CRUD | `/admin/products` |
| Quản lý coupons | List, create, toggle | `/admin/promotions` |
| Quản lý flash sales | Full CRUD + items | `/admin/flashsales` |
| Quản lý đánh giá | Duyệt/từ chối + AI moderation | `/admin/reviews` |
| Quản lý return requests | Duyệt + AI assist | `/admin/returns` |
| Quản lý refunds | Xử lý + AI assist | `/admin/refunds` |
| Quản lý payments | Danh sách + xác nhận COD | `/admin/payments` |
| Quản lý invoices | List + generate | `/admin/invoices` |
| Quản lý wallets | Danh sách | `/admin/wallets` |
| Duyệt nạp tiền wallet | Duyệt/từ chối topup request | `/admin/wallet-topups` |
| Quản lý shops | Duyệt/từ chối shop | `/admin/shops` |
| Quản lý support tickets | Xem, trả lời, AI assist | `/admin/tickets` |
| Quản lý FAQ | CRUD + AI answer | `/admin/faq` |
| Quản lý tồn kho | Xem movements + adjust | `/admin/inventory` |

---

## 23. 🛍️ Seller Dashboard

| Chức năng | MFE Route | Ghi chú |
|---|---|---|
| Dashboard thống kê shop | `/dashboard` | |
| Quản lý sản phẩm của shop | `/products` | CRUD |
| Xem đơn hàng của shop | `/orders` | |

**Lưu ý**: Seller không có API riêng biệt — dùng chung API nhưng filter theo `shopId`

---

## 24. 🧩 Frontend Shell & Shared

### Shell (`mfe-shell`, port 3010)
| Thành phần | Ghi chú |
|---|---|
| Root layout (AnnouncementBar + Header + Footer) | Bọc toàn bộ MFE qua Module Federation |
| AiChatWidget | Floating widget, public chat với AI support |
| AuthStore (Zustand) | Quản lý trạng thái đăng nhập |
| News page | `/news`, `/news/[id]` |
| Support page | `/support` — hướng dẫn, FAQs |
| Homepage | Hiển thị sản phẩm nổi bật |

### Shared packages
| Package | Chức năng |
|---|---|
| `@lishop/ui` | Shared UI components (toast, button, input, card, etc.) |
| `@lishop/shared` | API client, hooks, utilities (`hasSessionCookie`, date format, etc.) |
| `@lishop/event-bus` | Cross-MFE event bus (dùng CustomEvent) |
| `@lishop/contracts` | Zod schemas + TypeScript types dùng chung |
| `@lishop/config` | ESLint config, TypeScript base config |

### Module Federation
- Shell là host, các MFE là remote
- Mỗi MFE chạy port riêng (3001-3011)
- Navigation qua shell: Header + Footer render ở shell, content từ MFE

---

## 25. ⚙️ Environment Variables

### Backend (lishop-backend/.env)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NODE_ENV` | ✗ | `development` / `test` / `production` |
| `PORT` | ✗ | Mặc định 4000 |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string (BullMQ + caching) |
| `MEILISEARCH_URL` | ✗ | MeiliSearch URL (mặc định `http://localhost:7700`) |
| `MEILISEARCH_MASTER_KEY` | ✗ | |
| `JWT_ACCESS_SECRET` | ✅ | Secret cho JWT access token |
| `JWT_REFRESH_SECRET` | ✅ | Secret cho JWT refresh token |
| `JWT_ACCESS_EXPIRES_IN` | ✗ | Mặc định `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ✗ | Mặc định `7d` |
| `GOOGLE_CLIENT_ID` | ✗ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✗ | Google OAuth |
| `FACEBOOK_CLIENT_ID` | ✗ | Facebook OAuth |
| `FACEBOOK_CLIENT_SECRET` | ✗ | Facebook OAuth |
| `OPENAI_API_KEY` | ✗ (cần cho AI features) | OpenAI API key |
| `OPENAI_MODEL` | ✗ | Mặc định `gpt-5.2` |
| `UNSPLASH_ACCESS_KEY` | ✗ (cần cho AI image) | Unsplash API key |
| `SMTP_HOST` | ✗ | Mặc định `smtp.gmail.com` |
| `SMTP_PORT` | ✗ | Mặc định 587 |
| `SMTP_USER` | ✗ | SMTP username |
| `SMTP_PASS` | ✗ | SMTP password |
| `SMTP_FROM` | ✗ | Mặc định `noreply@lishop.vn` |
| `STRIPE_SECRET_KEY` | ✗ | Stripe |
| `STRIPE_WEBHOOK_SECRET` | ✗ | Stripe |
| `PAYPAL_CLIENT_ID` | ✗ | PayPal |
| `PAYPAL_CLIENT_SECRET` | ✗ | PayPal |
| `VNPAY_TMN_CODE` | ✗ (demo mặc định) | VNPAY |
| `VNPAY_HASH_SECRET` | ✗ (demo mặc định) | VNPAY |
| `VNPAY_URL` | ✗ | VNPAY |
| `VNPAY_RETURN_URL` | ✗ | VNPAY |
| `MOMO_PARTNER_CODE` | ✗ (demo mặc định) | MoMo |
| `MOMO_ACCESS_KEY` | ✗ (demo mặc định) | MoMo |
| `MOMO_SECRET_KEY` | ✗ (demo mặc định) | MoMo |
| `MOMO_ENDPOINT` | ✗ | MoMo |
| `MOMO_IPN_URL` | ✗ | MoMo |
| `MOMO_RETURN_URL` | ✗ | MoMo |
| `ZALOPAY_APP_ID` | ✗ (demo mặc định) | ZaloPay |
| `ZALOPAY_KEY1` | ✗ (demo mặc định) | ZaloPay |
| `ZALOPAY_KEY2` | ✗ (demo mặc định) | ZaloPay |
| `ZALOPAY_ENDPOINT` | ✗ | ZaloPay |
| `ZALOPAY_CALLBACK_URL` | ✗ | ZaloPay |
| `ZALOPAY_RETURN_URL` | ✗ | ZaloPay |
| `GHN_TOKEN` | ✗ | Giao Hàng Nhanh |
| `GHTK_TOKEN` | ✗ | Giao Hàng Tiết Kiệm |
| `FCM_SERVICE_ACCOUNT_JSON` | ✗ | Firebase Cloud Messaging (push notification) |
| `AWS_REGION` | ✗ | AWS S3 (mặc định `ap-southeast-1`) |
| `AWS_ACCESS_KEY_ID` | ✗ | AWS S3 |
| `AWS_SECRET_ACCESS_KEY` | ✗ | AWS S3 |
| `AWS_S3_BUCKET` | ✗ | AWS S3 (mặc định `lishop-assets`) |
| `CLIENT_URL` | ✗ | Frontend URL (cho OAuth redirect) |
| `ALLOWED_ORIGINS` | ✗ | Comma-separated CORS origins |

### Frontend (lishop-frontend/.env)

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API URL |
| `NEXT_PUBLIC_MFE_AUTH_URL` | ✅ | Port 3001 |
| `NEXT_PUBLIC_MFE_CATALOG_URL` | ✅ | Port 3002 |
| `NEXT_PUBLIC_MFE_CART_URL` | ✅ | Port 3003 |
| `NEXT_PUBLIC_MFE_CHECKOUT_URL` | ✅ | Port 3004 |
| `NEXT_PUBLIC_MFE_ORDERS_URL` | ✅ | Port 3005 |
| `NEXT_PUBLIC_MFE_PROFILE_URL` | ✅ | Port 3006 |
| `NEXT_PUBLIC_MFE_PROMOTIONS_URL` | ✅ | Port 3007 |
| `NEXT_PUBLIC_MFE_NOTIFICATIONS_URL` | ✅ | Port 3008 |
| `NEXT_PUBLIC_MFE_ADMIN_URL` | ✅ | Port 3009 |

---

## 26. 🐳 Docker Compose

File: `lishop-backend/docker-compose.yml`

| Service | Image | Port | Ghi chú |
|---|---|---|---|
| PostgreSQL | `postgres:16-alpine` | `5439:5432` | User: `lishop`, DB: `lishop_dev` |
| Redis | `redis:7-alpine` | `6380:6379` | |
| MeiliSearch | `getmeili/meilisearch:latest` | `7700:7700` | Master key: `masterKey` |

**Lưu ý**: Port PostgreSQL là `5439` (không phải 5432) để tránh xung đột. DATABASE_URL phải để `localhost:5439`.

---

## 27. 🧪 Testing

| Loại | Công cụ | Ghi chú |
|---|---|---|
| Unit tests (Backend) | Jest | `pnpm test` từ root |
| E2E (Backend) | Jest (supertest) | `pnpm test:e2e` |
| E2E (Frontend) | Playwright | `pnpm e2e:checkout` |

---

## 28. ⚠️ Lưu ý kiến trúc quan trọng

1. **Monorepo management**: Dùng Turborepo + pnpm workspace. Backend có `packages/` (database, config, contracts), Frontend có `packages/` (ui, shared, event-bus, contracts, config).

2. **Auth flow**: 
   - Login → nhận JWT → set vào httpOnly cookie + `lishop_session` cookie (JS-readable)
   - Middleware guard kiểm tra cookie hoặc `Authorization: Bearer` header
   - Có `@Public()` decorator để bypass guard
   - Có `@OptionalJwtAuthGuard` — authenticated thì lấy user, không thì vẫn cho qua
   - JWT có `jti` (token ID) để blacklist khi logout

3. **Payment flow**:
   - Frontend gọi `POST /payments/:orderId/initiate` → nhận URL redirect
   - User redirect đến cổng thanh toán (hoặc mock simulator)
   - Thanh toán xong → redirect về `/checkout/payment-result`
   - Callback server-to-server: MoMo IPN, ZaloPay callback (không cần user tương tác)

4. **AI features**: Tất cả gọi OpenAI Responses API (`/v1/responses`) — không dùng chat completion endpoint. 
   - Có retry + backoff + timeout
   - Hỗ trợ ghi log

5. **Notification streaming**: SSE (`/notifications/stream`) cho realtime in-app, WebSocket (Socket.IO) cho real-time events khác (đơn hàng mới cho admin, etc.)

6. **Search**: Chưa rõ MeiliSearch đã được tích hợp active hay chưa. Frontend search dùng param `q` trên `GET /products` — backend có thể dùng PostgreSQL ILIKE hoặc MeiliSearch tuỳ cài đặt.

7. **File uploads**: 
   - Uploads lưu ở `lishop-backend/apps/api/uploads/`
   - Phục vụ static qua `@fastify/static` tại `/uploads/`
   - Support ticket media: base64 data URL → lưu file
   - Product images: có thể upload riêng (S3 đã cấu hình nhưng chưa rõ tích hợp)
