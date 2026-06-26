# 🏗️ Lishop — Kiến trúc hệ thống

> **Công nghệ**: NestJS + PostgreSQL + Redis · Next.js 15 + Module Federation · Turborepo + pnpm

---

## 1. Tổng quan hệ thống (System Architecture)

```mermaid
flowchart TB
    subgraph FE["Frontend (Next.js 15 + Module Federation)"]
        SHELL["Shell (Port 3010)\nLayout, Header, Footer, AuthStore"]
        MFE_AUTH["MFE Auth (3001)\nLogin, Register, OAuth"]
        MFE_CATALOG["MFE Catalog (3002)\nProducts, Categories, Shops"]
        MFE_CART["MFE Cart (3003)\nCart Management"]
        MFE_CHECKOUT["MFE Checkout (3004)\nCheckout, Payment Simulator"]
        MFE_ORDERS["MFE Orders (3005)\nOrder History, Tracking"]
        MFE_PROFILE["MFE Profile (3006)\nProfile, Wallet, Wishlist"]
        MFE_PROMO["MFE Promotions (3007)\nCoupons, Flash Sales"]
        MFE_NOTIF["MFE Notifications (3008)\nIn-App, Preferences"]
        MFE_ADMIN["MFE Admin (3009)\nDashboard, Management"]
        MFE_SELLER["MFE Seller (3011)\nShop Dashboard"]
    end

    subgraph BE["Backend (NestJS — Port 4000)"]
        API["REST API\n(Fastify + Swagger)"]
        WS["WebSocket Gateway\n(Socket.IO)"]
        SSE["SSE Stream\n(Notifications)"]
        BULL["BullMQ Queue\n(Mail)"]
    end

    subgraph SERVICES["External Services & Infrastructure"]
        PG[("PostgreSQL 16\n(Docker port 5439)")]
        REDIS[("Redis 7\n(Docker port 6380)")]
        MEILI[("MeiliSearch\n(Docker port 7700)")]
        SMTP["SMTP (Email)"]
        OAUTH["Google / Facebook OAuth"]
        OPENAI["OpenAI API\n(gpt-5.2)"]
        UNSPLASH["Unsplash API"]
        PAYMENT_GW["VNPAY / MoMo / ZaloPay\nStripe / PayPal"]
        FCM["Firebase Cloud\nMessaging (FCM)"]
        S3[("AWS S3\n(Product Assets)")]
    end

    SHELL --> MFE_AUTH & MFE_CATALOG & MFE_CART & MFE_CHECKOUT
    SHELL --> MFE_ORDERS & MFE_PROFILE & MFE_PROMO
    SHELL --> MFE_NOTIF & MFE_ADMIN & MFE_SELLER

    MFE_AUTH --> API
    MFE_CATALOG --> API
    MFE_CART --> API
    MFE_CHECKOUT --> API
    MFE_ORDERS --> API
    MFE_PROFILE --> API
    MFE_PROMO --> API
    MFE_NOTIF --> SSE
    MFE_NOTIF --> API
    MFE_ADMIN --> API
    MFE_SELLER --> API

    API --> PG
    API --> REDIS
    API --> OAUTH
    API --> OPENAI
    API --> UNSPLASH
    API --> SMTP
    API --> PAYMENT_GW
    API --> FCM
    API --> S3
    WS --> REDIS
    BULL --> REDIS
    BULL --> SMTP
    MEILI --> PG
```

---

## 2. Backend Module Graph (NestJS)

```mermaid
flowchart TB
    subgraph MODULES["NestJS Application Modules"]
        CORE["ConfigModule\n(Global — Joi Validation)"]
        REDIS_MOD["RedisModule\n(Global)"]

        AUTH["AuthModule\nJWT, OAuth, Guards"]
        USERS["UsersModule"]
        ADDRESSES["AddressesModule"]
        SHOPS["ShopsModule"]
        CATEGORIES["CategoriesModule"]
        PRODUCTS["ProductsModule"]
        CART["CartModule"]
        ORDERS["OrdersModule"]
        PAYMENTS["PaymentsModule"]
        SHIPPING["ShippingModule"]
        REVIEWS["ReviewsModule"]
        RETURNS["ReturnsModule"]
        REFUNDS["RefundsModule"]
        INVOICES["InvoicesModule"]
        WALLET["WalletModule"]
        PROMOTIONS["PromotionsModule"]
        WISHLIST["WishlistModule"]
        INVENTORY["InventoryModule"]
        NOTIFICATIONS["NotificationsModule"]
        REALTIME["RealtimeModule\n(Socket.IO)"]
        SUPPORT["SupportModule"]
        SHOPPING["ShoppingModule\n(Concierge + Fit Advisor)"]
        ADMIN["AdminModule"]

        MAIL["MailModule\n(BullMQ Queue)"]
    end

    AUTH --> REDIS_MOD
    AUTH --> MAIL
    USERS --> AUTH
    ADDRESSES --> AUTH
    SHOPS --> AUTH
    SHOPS --> PRODUCTS
    PRODUCTS --> CATEGORIES
    PRODUCTS --> AUTH
    CART --> AUTH
    CART --> PROMOTIONS
    ORDERS --> AUTH
    ORDERS --> CART
    ORDERS --> ADDRESSES
    ORDERS --> INVENTORY
    PAYMENTS --> ORDERS
    SHIPPING --> ORDERS
    REVIEWS --> AUTH
    RETURNS --> ORDERS
    RETURNS --> REALTIME
    RETURNS --> NOTIFICATIONS
    RETURNS --> REFUNDS
    REFUNDS --> WALLET
    REFUNDS --> NOTIFICATIONS
    WALLET --> AUTH
    WALLET --> NOTIFICATIONS
    WALLET --> REALTIME
    PROMOTIONS --> REALTIME
    INVENTORY --> REALTIME
    NOTIFICATIONS --> REALTIME
    SUPPORT --> NOTIFICATIONS
    SUPPORT --> REALTIME
    SUPPORT --> PRODUCTS
    SUPPORT --> ORDERS
    SHOPPING --> PRODUCTS
    ADMIN --> AUTH
    ADMIN --> (Tất cả service modules)

    MAIL --> REDIS_MOD
```

---

## 3. Database Schema (Class Diagrams)

```mermaid
classDiagram

    class User {
        +String id
        +String email [unique]
        +String passwordHash
        +String firstName
        +String lastName
        +String avatarUrl
        +String role [CUSTOMER, ADMIN, SELLER]
        +Int loyaltyPoints
        +Boolean emailVerified
        +String googleId [unique]
        +String facebookId [unique]
        +DateTime createdAt
        +DateTime updatedAt
    }

    class DeviceToken {
        +String id
        +String userId
        +String token [unique]
        +String platform
    }

    class Shop {
        +String id
        +String name [unique]
        +String slug [unique]
        +String description
        +String logoUrl
        +String bannerUrl
        +String phone
        +String address
        +String status [PENDING, APPROVED, REJECTED]
        +String userId [unique]
        +DateTime approvedAt
        +String approvedById
        +String rejectionReason
    }

    class Address {
        +String id
        +String userId
        +String fullName
        +String phone
        +String street
        +String district
        +String city
        +String country
        +Float latitude
        +Float longitude
        +Boolean isDefault
    }

    class Category {
        +String id
        +String name
        +String slug [unique]
        +String imageUrl
        +String parentId
    }

    class Product {
        +String id
        +String name
        +String slug [unique]
        +String sku [unique]
        +String description
        +Int priceVnd
        +Int priceUsd
        +Int stock
        +Int weightGrams
        +String categoryId
        +String shopId
        +Float averageRating
        +Int reviewCount
    }

    class ProductImage {
        +String id
        +String productId
        +String url
        +String alt
        +Boolean isPrimary
    }

    class ProductVariant {
        +String id
        +String productId
        +String sku [unique]
        +String name
        +Int priceVnd
        +Int priceUsd
        +Int stock
        +Int weightGrams
        +Json attributes
        +String imageUrl
        +Boolean isDefault
        +Boolean isActive
    }

    class Tag {
        +String id
        +String name [unique]
    }

    class ProductTag {
        +String productId [composite PK]
        +String tagId [composite PK]
    }

    class CartItem {
        +String id
        +String userId
        +String productId
        +String variantId
        +Int quantity
    }

    class Wishlist {
        +String id
        +String userId
        +String productId
    }

    class Order {
        +String id
        +String orderNumber [unique]
        +String userId
        +String addressId
        +String status [PENDING, PROCESSING, SHIPPED, DELIVERED, CANCELLED, REFUNDED]
        +String shippingProvider [GHN, GHTK, VIETTEL_POST]
        +Int subtotalVnd
        +Int shippingFeeVnd
        +Int discountVnd
        +Int totalVnd
        +String notes
        +String trackingNumber
        +DateTime createdAt
    }

    class OrderItem {
        +String id
        +String orderId
        +String productId
        +String variantId
        +String shopId
        +String productName [snapshot]
        +String variantName [snapshot]
        +String variantSku [snapshot]
        +Json variantAttributes [snapshot]
        +Int quantity
        +Int unitPriceVnd
        +Int totalPriceVnd
    }

    class StockMovement {
        +String id
        +String productId
        +String type [ORDER_PLACED, ORDER_CANCELLED, RETURN_COMPLETED, ADMIN_ADJUSTMENT]
        +Int delta
        +Int balanceAfter
        +String referenceId
        +String note
    }

    class Payment {
        +String id
        +String orderId [unique]
        +String method [STRIPE, PAYPAL, VNPAY, MOMO, ZALOPAY, WALLET, COD]
        +Int amountVnd
        +String status [PENDING, COMPLETED, FAILED, REFUNDED]
        +String providerRef
        +String invoiceUrl
    }

    class Shipment {
        +String id
        +String orderId [unique]
        +String provider
        +String trackingNumber
        +DateTime estimatedAt
        +DateTime shippedAt
        +DateTime deliveredAt
    }

    class ShipmentEvent {
        +String id
        +String shipmentId
        +String status
        +String location
        +String description
        +DateTime createdAt
    }

    class Review {
        +String id
        +String productId
        +String userId
        +Int rating
        +String content
        +String status [PENDING, APPROVED, REJECTED]
        +Boolean verifiedPurchase
    }

    class ReturnRequest {
        +String id
        +String orderId [unique]
        +String userId
        +String status [PENDING, APPROVED, REJECTED, RECEIVED, COMPLETED]
        +String reason [DAMAGED, WRONG_ITEM, NOT_AS_DESCRIBED, CHANGED_MIND, OTHER]
        +String description
        +String adminNote
    }

    class ReturnItem {
        +String id
        +String returnRequestId
        +String orderItemId
        +Int quantity
    }

    class Refund {
        +String id
        +String orderId
        +String returnId [unique]
        +String userId
        +Int amountVnd
        +String method [ORIGINAL_PAYMENT, WALLET, MANUAL]
        +String status [PENDING, PROCESSING, COMPLETED, FAILED]
        +String reason
        +String adminNote
        +DateTime processedAt
    }

    class Wallet {
        +String id
        +String userId [unique]
        +Int balanceVnd
    }

    class WalletTransaction {
        +String id
        +String walletId
        +String type [TOPUP, PAYMENT, REFUND, WITHDRAW, POINTS_CONVERSION]
        +Int amountVnd
        +Int balanceAfter
        +String description
        +String referenceId
    }

    class WalletTopupRequest {
        +String id
        +String userId
        +String walletId
        +Int amountVnd
        +String status [PENDING, APPROVED, REJECTED]
        +String transferCode [unique]
        +String bankName
        +String bankAccountNumber
        +String bankAccountName
        +String adminNote
        +String reviewedById
        +DateTime reviewedAt
    }

    class Coupon {
        +String id
        +String code [unique]
        +String type [PERCENT, FIXED, FREE_SHIPPING]
        +Int value
        +Int minOrderVnd
        +Int maxUses
        +Int usedCount
        +DateTime expiresAt
        +Boolean isActive
    }

    class CouponUsage {
        +String id
        +String couponId
        +String userId
    }

    class FlashSale {
        +String id
        +DateTime startAt
        +DateTime endAt
        +Boolean isActive
    }

    class FlashSaleItem {
        +String id
        +String flashSaleId
        +String productId
        +Int discountPercent
    }

    class SupportTicket {
        +String id
        +String userId
        +String orderRef
        +String category [ORDER, PRODUCT, SHIPPING, PAYMENT, RETURN, OTHER]
        +String subject
        +String status [OPEN, IN_PROGRESS, RESOLVED, CLOSED]
    }

    class TicketMessage {
        +String id
        +String ticketId
        +String userId
        +Boolean isAdmin
        +String content
    }

    class FAQ {
        +String id
        +String question
        +String answer
        +String category
        +Int sortOrder
        +Boolean isPublished
    }

    class Notification {
        +String id
        +String userId
        +String title
        +String body
        +String type
        +String relatedId
        +Boolean isRead
    }

    class NotificationPreference {
        +String id
        +String userId
        +String eventType
        +Boolean emailEnabled
        +Boolean pushEnabled
        +Boolean inAppEnabled
    }

    class Invoice {
        +String id
        +String orderId [unique]
        +String userId
        +String invoiceNo [unique]
        +String billingName
        +String billingEmail
        +String billingAddress
        +String billingPhone
        +Int subtotalVnd
        +Int discountVnd
        +Int shippingFeeVnd
        +Int vatPercent
        +Int vatVnd
        +Int totalVnd
    }

    class LoyaltyPoint {
        +String id
        +String userId
        +Int points
        +String description
    }

    User "1" --> "*" Address : has
    User "1" --> "*" Order : places
    User "1" --> "*" Review : writes
    User "1" --> "*" CartItem : owns
    User "1" --> "*" Wishlist : has
    User "1" --> "*" Notification : receives
    User "1" --> "*" DeviceToken : registers
    User "1" --> "*" NotificationPreference : configures
    User "1" --> "*" LoyaltyPoint : earns
    User "1" --> "*" CouponUsage : uses
    User "1" --> "*" ReturnRequest : requests
    User "1" --> "*" SupportTicket : creates
    User "1" --> "*" TicketMessage : sends
    User "1" --> "1" Wallet : has
    User "1" --> "*" WalletTopupRequest : submits
    User "1" --> "*" Invoice : receives
    User "1" --> "*" Refund : gets
    User "1" --> "0..1" Shop : owns
    User "1" --> "*" Shop : approves

    Shop "1" --> "*" Product : sells
    Shop "1" --> "*" OrderItem : fulfills

    Category "1" --> "*" Category : has_child
    Category "1" --> "*" Product : contains

    Product "1" --> "*" ProductImage : has
    Product "1" --> "*" ProductVariant : has
    Product "1" --> "*" ProductTag : tagged
    Product "1" --> "*" Tag : tagged_via
    Product "1" --> "*" Review : receives
    Product "1" --> "*" CartItem : in_carts
    Product "1" --> "*" OrderItem : ordered
    Product "1" --> "*" Wishlist : wished
    Product "1" --> "*" StockMovement : tracks
    Product "1" --> "*" FlashSaleItem : discounted

    Order "1" --> "*" OrderItem : contains
    Order "1" --> "1" Payment : has
    Order "1" --> "1" Shipment : ships
    Order "1" --> "0..1" ReturnRequest : returns
    Order "1" --> "1" Invoice : billed
    Order "1" --> "*" Refund : refunded
    Order "1" --> "1" Address : delivered_to

    Shipment "1" --> "*" ShipmentEvent : tracks

    ReturnRequest "1" --> "*" ReturnItem : includes
    ReturnRequest "0..1" --> "0..1" Refund : refunds

    Wallet "1" --> "*" WalletTransaction : logs
    Wallet "1" --> "*" WalletTopupRequest : topups

    Coupon "1" --> "*" CouponUsage : used

    FlashSale "1" --> "*" FlashSaleItem : includes

    SupportTicket "1" --> "*" TicketMessage : contains
```

### 🔗 Relationship Map (Tóm tắt)

```mermaid
flowchart TB
    User -->|"1→N"| Address
    User -->|"1→N"| Order
    User -->|"1→1"| Wallet
    User -->|"1→1"| Shop
    User -->|"1→N"| CartItem
    User -->|"1→N"| Review
    User -->|"1→N"| Wishlist
    User -->|"1→N"| Notification
    User -->|"1→N"| SupportTicket
    User -->|"1→N"| ReturnRequest
    User -->|"1→N"| CouponUsage

    Shop -->|"1→N"| Product

    Category -->|"1→N"| Product
    Category -->|"1→N"| Category

    Product -->|"1→N"| ProductImage
    Product -->|"1→N"| ProductVariant
    Product -->|"N→N"| Tag
    Product -->|"1→N"| Review
    Product -->|"1→N"| CartItem
    Product -->|"1→N"| Wishlist
    Product -->|"1→N"| StockMovement

    Order -->|"1→N"| OrderItem
    Order -->|"1→1"| Payment
    Order -->|"1→1"| Shipment
    Order -->|"1→1"| ReturnRequest
    Order -->|"1→1"| Invoice
    Order -->|"1→N"| Refund

    Shipment -->|"1→N"| ShipmentEvent

    ReturnRequest -->|"1→1"| Refund
    ReturnRequest -->|"1→N"| ReturnItem

    Wallet -->|"1→N"| WalletTransaction
    Wallet -->|"1→N"| WalletTopupRequest

    Coupon -->|"1→N"| CouponUsage
    FlashSale -->|"1→N"| FlashSaleItem

    SupportTicket -->|"1→N"| TicketMessage
```

---

## 4. Micro-Frontend Architecture (Module Federation)

```mermaid
flowchart LR
    subgraph HOST["Shell (Host) — Port 3010"]
        direction TB
        LAYOUT["RootLayout\n(AnnouncementBar + Header + Main + Footer)"]
        AICHAT["AiChatWidget\n(Floating chatbot)"]
        AUTHSTORE["AuthStore (Zustand)\nSession state via lishop_session cookie"]
        UI["@lishop/ui\n(Shared components)"]
        EB["@lishop/event-bus\n(Cross-MFE communication)"]
    end

    subgraph REMOTES["Micro-Frontends (Remotes)"]
        AUTH["mfe-auth\nPort 3001\n/login, /register\n/forgot-password"]
        CATALOG["mfe-catalog\nPort 3002\n/products, /shops"]
        CART["mfe-cart\nPort 3003\n/cart"]
        CHECKOUT["mfe-checkout\nPort 3004\n/checkout\n/payment-simulator"]
        ORDERS["mfe-orders\nPort 3005\n/orders"]
        PROFILE["mfe-profile\nPort 3006\n/profile, /wallet\n/addresses, /wishlist"]
        PROMO["mfe-promotions\nPort 3007\n/promotions"]
        NOTIF["mfe-notifications\nPort 3008\n/notifications"]
        ADMIN["mfe-admin\nPort 3009\n/admin/*"]
        SELLER["mfe-seller\nPort 3011\n/dashboard, /products\n/orders"]
    end

    HOST -- "Module Federation\n(Next.js 15)" --> REMOTES

    subgraph SHARED["Shared Packages"]
        CONTRACTS["@lishop/contracts\n(Zod schemas + Types)"]
        CONFIG_PKG["@lishop/config\n(ESLint + TS config)"]
    end

    REMOTES --> SHARED

    subgraph API_BACKEND["Backend API"]
        API["NestJS REST\nPort 4000"]
    end

    REMOTES -- "REST + httpOnly cookies" --> API_BACKEND
    NOTIF -- "SSE Stream" --> API_BACKEND
```

---

## 5. Authentication Flow

```mermaid
sequenceDiagram
    participant User as Browser
    participant MFE as MFE Auth
    participant API as Backend API
    participant DB as PostgreSQL
    participant OAuth as Google/Facebook
    participant Redis

    %% Email/Password Login
    User->>MFE: Nhập email + password
    MFE->>API: POST /auth/login
    API->>DB: Verify credentials
    DB-->>API: User data
    API->>API: Generate JWT (access + refresh)
    API->>Redis: Store refresh token (optional blacklist)
    API-->>MFE: Set cookies:
    Note over API: Set-Cookie: lishop_at (httpOnly, 15m)
    Note over API: Set-Cookie: lishop_session (JS-readable)
    Note over API: Set-Cookie: refresh_token (httpOnly, 7d)
    API-->>MFE: { accessToken }
    MFE->>MFE: Update AuthStore (Zustand)
    MFE-->>User: Redirect to home / dashboard

    %% Token Refresh
    User->>MFE: Tương tác → cần token mới
    MFE->>API: POST /auth/refresh (có refresh_token cookie)
    API->>Redis: Verify refresh token
    API->>API: Generate new JWT pair
    API-->>MFE: Set new cookies
    API-->>MFE: { accessToken }

    %% Google OAuth
    User->>MFE: Click "Đăng nhập với Google"
    MFE->>API: GET /auth/oauth/google/initiate
    API-->>User: 302 Redirect → accounts.google.com
    User->>OAuth: Đăng nhập Google + consent
    OAuth-->>User: 302 Redirect → /auth/oauth/google/callback
    User->>API: GET /auth/oauth/google/callback?code=...
    API->>OAuth: Exchange code for tokens
    OAuth-->>API: User info
    API->>DB: Find or create user
    API->>API: Generate JWT pair
    API-->>User: Set cookies + 302 Redirect → CLIENT_URL

    %% Logout
    User->>MFE: Click "Đăng xuất"
    MFE->>API: POST /auth/logout (Bearer + refresh cookie)
    API->>Redis: Blacklist JWT (jti) + remove refresh token
    API-->>MFE: Clear all cookies
    MFE->>MFE: Clear AuthStore
```

---

## 6. Payment Flow

```mermaid
sequenceDiagram
    participant User as Browser
    participant MFE as MFE Checkout
    participant API as Backend API
    participant DB as PostgreSQL
    participant Gateway as VNPAY/MoMo/ZaloPay
    participant Admin

    %% 1. Initiate Payment
    User->>MFE: Chọn phương thức thanh toán + Xác nhận đặt hàng
    MFE->>API: POST /orders (đặt hàng)
    API->>DB: Tạo Order + OrderItems
    API->>DB: Tạo Payment (PENDING)
    API->>DB: Trừ stock
    API->>DB: Xoá CartItems
    API-->>MFE: { orderId, orderNumber }

    MFE->>API: POST /payments/:orderId/initiate
    API->>API: Xác định phương thức thanh toán
    alt COD hoặc Wallet
        API->>DB: Cập nhật trạng thái
        API-->>MFE: { paymentUrl: null, status: "PENDING" }
    else VNPAY / MoMo / ZaloPay
        API->>Gateway: Tạo payment URL
        Gateway-->>API: paymentUrl
        API-->>MFE: { paymentUrl, status: "PENDING" }
        MFE-->>User: Redirect đến cổng thanh toán
        User->>Gateway: Nhập thông tin thanh toán
        alt DEMO credentials
            Gateway->>MFE: Redirect → /checkout/payment-simulator
            MFE->>MFE: Mô phỏng thanh toán
            MFE->>API: POST /payments/mock/webhook
        else PRODUCTION
            Gateway->>User: 302 Redirect → /checkout/payment-result
            Note over Gateway,API: Kèm callback server-to-server
            Gateway->>API: Webhook / IPN (server-to-server)
        end
        API->>DB: Cập nhật Payment → COMPLETED
        API->>DB: Cập nhật Order → PROCESSING
        API-->>MFE: { success: true }
    end

    MFEs-->>User: Hiển thị kết quả

    %% Admin manual confirm (COD)
    Admin->>Admin: Xác nhận thanh toán COD
    Admin->>API: PATCH /admin/payments/:id/confirm
    API->>DB: Payment → COMPLETED, Order → PROCESSING
```

---

## 7. AI Features Architecture

```mermaid
flowchart LR
    subgraph FRONTEND["Frontend"]
        DISC["Product Discovery\n(NL search)"]
        REC["Recommendations\n(Personalised)"]
        CONCIERGE["Shopping Concierge\n(NL shopping assistant)"]
        FIT["Style & Fit Advisor\n(Size recommendation)"]
        CHAT["Support Chatbot\n(Floating widget)"]
        ADMIN_AI["Admin AI Tools\n(Copy, Moderation,\nAssist, Insights)"]
    end

    subgraph BACKEND["Backend (NestJS)"]
        PROD_SVC["ProductsService"]
        SHOP_SVC["ShoppingService"]
        SUPPORT_SVC["SupportService"]
        ADMIN_SVC["AdminService"]
        REVIEW_SVC["ReviewsService"]
        RETURN_SVC["ReturnsService"]
        REFUND_SVC["RefundsService"]
        FAQ_SVC["FaqService"]
        WALLET_SVC["WalletService"]
    end

    subgraph AI["AI Layer"]
        OPENAI_RESP["OpenAI Responses API\n(GPT-5.2)"]
        UNSPLASH_API["Unsplash API\n(Product images)"]
    end

    FRONTEND --> BACKEND

    PROD_SVC --> OPENAI_RESP
    SHOP_SVC --> OPENAI_RESP
    SUPPORT_SVC --> OPENAI_RESP
    ADMIN_SVC --> OPENAI_RESP
    ADMIN_SVC --> UNSPLASH_API
    REVIEW_SVC --> OPENAI_RESP
    RETURN_SVC --> OPENAI_RESP
    REFUND_SVC --> OPENAI_RESP
    FAQ_SVC --> OPENAI_RESP
    WALLET_SVC --> OPENAI_RESP
```

---

## 8. Docker Infrastructure

```mermaid
flowchart LR
    subgraph DOCKER["Docker Compose (lishop-backend/docker-compose.yml)"]
        PG[("PostgreSQL 16\nPort 5439 → 5432\nUser: lishop\nDB: lishop_dev")]
        REDIS_C["Redis 7\nPort 6380 → 6379"]
        MEILI_C["MeiliSearch\nPort 7700 → 7700\nMaster Key: masterKey"]
    end

    subgraph LOCAL["Local Dev"]
        BE_SVC["Backend (NestJS)\nPort 4000"]
        FE_SHELL["Shell\nPort 3010"]
        FE_MFES["MFEs\nPorts 3001-3011"]
    end

    PG --> BE_SVC
    REDIS_C --> BE_SVC
    MEILI_C --> BE_SVC
    BE_SVC --> FE_MFES
    FE_SHELL --> FE_MFES
```

---

## 9. Tech Stack Overview

```mermaid
mindmap
  root((Lishop))
    Backend
      NestJS 10
        Fastify
        Socket.IO
        BullMQ
        Throttler
        Swagger
      Prisma ORM
      PostgreSQL 16
      Redis 7
      MeiliSearch
      jose (JWT)
      OpenAI API
      Unsplash API
    Frontend
      Next.js 15
        Turbopack
      Module Federation
      React 19
      TanStack Query
      Zustand
      Tailwind CSS 4
      Lucide Icons
      Recharts (Admin)
      React Hook Form + Zod
    DevOps
      Turborepo
      pnpm workspace
      Docker Compose
      Playwright (E2E)
      Jest (Unit)
      ESLint
    External Services
      VNPAY
      MoMo
      ZaloPay
      Stripe
      PayPal
      Google OAuth
      Facebook OAuth
      Firebase Cloud Messaging
      AWS S3
      SMTP (Email)
```

---

---

## 10. Data Flow — Đặt hàng & Thanh toán (Order → Payment → Shipment)

```mermaid
flowchart TB
    subgraph USER["User Journey"]
        CART_VIEW["Xem giỏ hàng"]
        CHECKOUT["Nhập địa chỉ\nChọn phương thức VC\nChọn phương thức TT"]
        PLACE_ORDER["Đặt hàng"]
        PAY["Thanh toán"]
        TRACK["Theo dõi đơn hàng"]
        CONFIRM["Xác nhận đã nhận"]
        REVIEW["Đánh giá sản phẩm"]
    end

    subgraph API_DATA["API Layer — Data Flow"]
        CART_API["POST /cart\n→ cartItems (userId, productId, variantId, qty)"]
        ORDER_API["POST /orders\n→ Order (userId, addressId, items, subtotal, shippingFee, discount, total)"]
        PAY_API["POST /payments/:id/initiate\n→ Payment (method, amount, status)"]
        TRACK_API["GET /orders/:id/tracking\n→ Shipment + ShipmentEvent[]"]
        CONFIRM_API["PATCH /orders/:id/confirm-delivered\n→ Order.status = DELIVERED"]
        REVIEW_API["POST /reviews\n→ Review (rating, content, verifiedPurchase=true)"]
    end

    subgraph DB_STATE["Database State Changes"]
        CART_DB["CartItem: thêm/xoá/sửa"]
        ORDER_DB["Order: PENDING\nOrderItem: tạo\nCartItem: xoá"]
        STOCK_DB["StockMovement: ORDER_PLACED\nProduct.stock -= qty"]
        PAY_DB["Payment: PENDING → COMPLETED\nOrder: PENDING → PROCESSING"]
        SHIP_DB["Shipment: tạo\nShipmentEvent: cập nhật\nOrder: PROCESSING → SHIPPED → DELIVERED"]
        RETURN_DB["ReturnRequest: tạo\nRefund: tạo\nStockMovement: RETURN_COMPLETED"]
    end

    subgraph NOTIFY["Notification & Events"]
        NOTIF_ORDER["🔔 Thông báo đơn hàng mới (Admin)"]
        NOTIF_STATUS["🔔 Cập nhật trạng thái (User)"]
        NOTIF_REVIEW["🔔 Đánh giá mới (Admin moderation)"]
        WS_ADMIN["WebSocket → admin room"]
        WS_USER["WebSocket → user:{userId}"]
    end

    CART_VIEW --> CART_API --> CART_DB
    CHECKOUT --> ORDER_API --> ORDER_DB
    ORDER_DB --> STOCK_DB
    ORDER_DB --> CART_DB
    PLACE_ORDER --> NOTIF_ORDER
    NOTIF_ORDER --> WS_ADMIN

    ORDER_API --> PAY_API --> PAY_DB
    PAY_DB --> NOTIF_STATUS --> WS_USER

    TRACK --> TRACK_API --> SHIP_DB
    SHIP_DB --> NOTIF_STATUS --> WS_USER

    CONFIRM --> CONFIRM_API --> SHIP_DB
    CONFIRM --> REVIEW_API --> REVIEW_DB[Review: PENDING\nReviewStatus: PENDING]

    REVIEW --> REVIEW_API
    REVIEW_API --> NOTIF_REVIEW --> WS_ADMIN

    CONFIRM --> RETURN_DB
```

---

## 11. Data Flow — Duyệt & Tìm kiếm sản phẩm (Product Catalog)

```mermaid
flowchart LR
    subgraph USER_ACTIONS["User Actions"]
        SEARCH["Tìm kiếm (q=...)"]
        FILTER["Filter\n(category, price, sort)"]
        BROWSE["Xem danh mục"]
        DETAIL["Xem chi tiết sản phẩm"]
        AI_DISC["AI Discovery\n(câu hỏi tự nhiên)"]
        REC["Xem gợi ý"]
    end

    subgraph API["API Endpoints"]
        LIST["GET /products\n(q, categoryId, minPrice,\nmaxPrice, sortBy, cursor, limit)"]
        FEATURED["GET /products/featured\n(limit=8)"]
        BY_SLUG["GET /products/:slug\n→ product + variants + images + tags"]
        RELATED["GET /products/:slug/related\n→ products cùng category/tags"]
        CAT_LIST["GET /categories\n→ categories tree"]
        CAT_PROD["GET /categories/:slug/products\n→ products in category"]
        AI_DISCOVERY["POST /products/ai-discovery\n→ message → GPT → suggestions"]
        RECOMMEND["GET /products/recommendations\n(userId?, limit, context)"]
    end

    subgraph DATA["Data Returned"]
        PROD_LIST["{ data: Product[],\n  nextCursor: string,\n  total: number }"]
        PROD_DETAIL["{ product: { name, slug, price,\n  description, images, variants,\n  tags, averageRating, shop },\n  relatedProducts: Product[] }"]
        CAT_TREE["{ id, name, slug,\n  children: Category[] }"]
        AI_RESULT["{ message, products,\n  reasoning }"]
    end

    SEARCH --> LIST --> PROD_LIST
    FILTER --> LIST --> PROD_LIST
    BROWSE --> CAT_LIST --> CAT_TREE
    BROWSE --> CAT_PROD --> PROD_LIST
    DETAIL --> BY_SLUG --> PROD_DETAIL
    DETAIL --> RELATED
    AI_DISC --> AI_DISCOVERY --> AI_RESULT
    REC --> RECOMMEND

    subgraph CACHE["Caching Strategy"]
        REDIS_PROD["Redis Cache\n• Featured products (5 phút)\n• Category tree (1 giờ)\n• Product detail (10 phút)"]
    end

    LIST --> REDIS_PROD
    FEATURED --> REDIS_PROD
    BY_SLUG --> REDIS_PROD
    CAT_LIST --> REDIS_PROD
```

---

## 12. Data Flow — Xác thực & Phiên làm việc (Auth & Session)

```mermaid
flowchart TB
    subgraph CLIENT["Browser"]
        COOKIE_AT["lishop_at (httpOnly)\nJWT Access Token"]
        COOKIE_RT["refresh_token (httpOnly)\nJWT Refresh Token"]
        COOKIE_SESS["lishop_session (JS-readable)\nIndicator: '1' or ''"]
        AUTH_STORE["AuthStore (Zustand)\n{ isLoggedIn, user }"]
    end

    subgraph API_BE["Backend API"]
        LOGIN["POST /auth/login\n→ verify → JWT pair"]
        REFRESH["POST /auth/refresh\n→ verify RT → new JWT pair"]
        ME["GET /auth/me\n→ verify AT → user data"]
        LOGOUT["POST /auth/logout\n→ blacklist JTI + clear RT"]
        REGISTER["POST /auth/register\n→ hash password → create user → email verify"]
    end

    subgraph DATA_STORE["Data Storage"]
        PG_USER["PostgreSQL: User\n(id, email, passwordHash,\nrole, googleId, facebookId)"]
        PG_TOKEN["PostgreSQL: (no refresh token table)\n→ JWT tự xác thực"]
        REDIS_BL["Redis:\nblacklist:token:{jti}\n→ logout"]
    end

    subgraph EXTERNAL["External"]
        OAUTH_G["Google OAuth"]
        OAUTH_F["Facebook OAuth"]
        SMTP_MAIL["SMTP (Email verification\n+ Forgot password)"]
    end

    CLIENT --> LOGIN
    LOGIN --> PG_USER
    LOGIN --> CLIENT
    CLIENT --> REFRESH
    CLIENT --> ME
    ME --> PG_USER
    CLIENT --> LOGOUT
    LOGOUT --> REDIS_BL
    REGISTER --> PG_USER
    REGISTER --> SMTP_MAIL

    OAUTH_G --> LOGIN
    OAUTH_F --> LOGIN

    %% Data flow description
    CLIENT -->|"Đọc cookie lishop_session\n→ hasSessionCookie()"| AUTH_STORE
    AUTH_STORE -->|"isLoggedIn = true/false"| MFES[All MFEs]
    MFES -->|"Gọi API → auto gửi httpOnly cookie"| API_BE
```

---

## 13. Data Flow — Thông báo (Notification System)

```mermaid

```

---

## 14. Data Flow — Admin Operations

```mermaid

```

---

## 15. Data Flow — Ví & Hoàn tiền (Wallet & Refund)

```mermaid
flowchart TB
    subgraph WALLET_USER["User Wallet"]
        VIEW["Xem số dư\nGET /wallet\n→ { balance, transactions[] }"]
        TOPUP["Nạp tiền (chuyển khoản)\nPOST /wallet/topup-request\n→ { bankName, accountNumber, amount }"]
        PAY["Thanh toán bằng ví\n→ COD/Wallet → trừ balance"]
    end

    subgraph WALLET_DB["Database"]
        WALLET_TBL["Wallet\n(userId, balanceVnd)"]
        WALLET_TX["WalletTransaction\n(type, amount, balanceAfter)"]
        TOPUP_REQ["WalletTopupRequest\n(status, bankInfo, amount)"]
    end

    subgraph ADMIN_TOPUP["Admin Wallet Flow"]
        LIST_TOPUP["Xem danh sách\nGET /admin/wallet-topups"]
        APPROVE["Duyệt\nPATCH /admin/wallet-topups/:id/approve\n→ Wallet.balance += amount\n→ Transaction: TOPUP"]
        REJECT["Từ chối\nPATCH /admin/wallet-topups/:id/reject"]
    end

    subgraph REFUND["Refund Flow"]
        RETURN_REQ["Return được duyệt"]
        REFUND_CREATE["Refund: PENDING"]
        ADMIN_PROCESS["Admin xử lý\nPOST /admin/refunds/:id/process"]
        REFUND_WALLET["Nếu method = WALLET\n→ Wallet.balance += amount\n→ Transaction: REFUND"]
        REFUND_ORIG["Nếu method = ORIGINAL\n→ hoàn qua cổng BC"]
    end

    VIEW --> WALLET_TBL
    VIEW --> WALLET_TX
    TOPUP --> TOPUP_REQ
    PAY --> WALLET_TBL
    PAY --> WALLET_TX

    LIST_TOPUP --> TOPUP_REQ
    APPROVE --> TOPUP_REQ
    APPROVE --> WALLET_TBL
    APPROVE --> WALLET_TX
    REJECT --> TOPUP_REQ

    RETURN_REQ --> REFUND_CREATE
    REFUND_CREATE --> ADMIN_PROCESS
    ADMIN_PROCESS --> REFUND_WALLET
    ADMIN_PROCESS --> REFUND_ORIG
    REFUND_WALLET --> WALLET_TBL
    REFUND_WALLET --> WALLET_TX
```

---

## 16. Data Model — Product Domain (Chi tiết)

```mermaid
classDiagram
    class Product {
        +String id
        +String name
        +String slug
        +String sku
        +String description
        +Int priceVnd
        +Int priceUsd
        +Int stock
        +Int weightGrams
        +String categoryId
        +String shopId
        +Float averageRating
        +Int reviewCount
        +DateTime createdAt
        +DateTime updatedAt
    }

    class ProductImage {
        +String id
        +String productId
        +String url
        +String alt
        +Boolean isPrimary
    }

    class ProductVariant {
        +String id
        +String productId
        +String sku
        +String name
        +Int priceVnd
        +Int priceUsd
        +Int stock
        +Int weightGrams
        +Json attributes
        +String imageUrl
        +Boolean isDefault
        +Boolean isActive
    }

    class Tag {
        +String id
        +String name
    }

    class ProductTag {
        +String productId
        +String tagId
    }

    class Category {
        +String id
        +String name
        +String slug
        +String imageUrl
        +String parentId
    }

    class Shop {
        +String id
        +String name
        +String slug
        +String description
        +String logoUrl
        +String bannerUrl
        +String status
        +String userId
    }

    Product "1" --> "*" ProductImage : has
    Product "1" --> "*" ProductVariant : has
    Product "1" --> "*" ProductTag : tagged
    Product "*" --> "1" Category : belongs_to
    Product "*" --> "1" Shop : sold_by
    Tag "1" --> "*" ProductTag : categorized
    Category "1" --> "*" Category : parent_of
```

---

## 17. Data Model — Order & Payment Domain (Chi tiết)

```mermaid
classDiagram
    class Order {
        +String id
        +String orderNumber
        +String userId
        +String addressId
        +String status
        +String shippingProvider
        +Int subtotalVnd
        +Int shippingFeeVnd
        +Int discountVnd
        +Int totalVnd
        +String notes
        +String trackingNumber
        +DateTime createdAt
    }

    class OrderItem {
        +String id
        +String orderId
        +String productId
        +String variantId
        +String shopId
        +String productName
        +String variantName
        +Int quantity
        +Int unitPriceVnd
        +Int totalPriceVnd
    }

    class Payment {
        +String id
        +String orderId
        +String method
        +Int amountVnd
        +String status
        +String providerRef
        +String invoiceUrl
    }

    class Shipment {
        +String id
        +String orderId
        +String provider
        +String trackingNumber
        +DateTime estimatedAt
        +DateTime shippedAt
        +DateTime deliveredAt
    }

    class ShipmentEvent {
        +String id
        +String shipmentId
        +String status
        +String location
        +String description
        +DateTime createdAt
    }

    class Address {
        +String id
        +String userId
        +String fullName
        +String phone
        +String street
        +String district
        +String city
        +String country
        +Float latitude
        +Float longitude
        +Boolean isDefault
    }

    Order "1" --> "*" OrderItem : contains
    Order "1" --> "1" Payment : pays
    Order "1" --> "1" Shipment : ships
    Order "1" --> "1" Address : delivered_to
    Shipment "1" --> "*" ShipmentEvent : tracks
    OrderItem "*" --> "1" Product : references
    OrderItem "*" --> "0..1" ProductVariant : references
```

---

## 18. Data Model — Support & Review Domain

```mermaid
classDiagram
    class SupportTicket {
        +String id
        +String userId
        +String orderRef
        +String category
        +String subject
        +String status
        +DateTime createdAt
        +DateTime updatedAt
    }

    class TicketMessage {
        +String id
        +String ticketId
        +String userId
        +Boolean isAdmin
        +String content
        +DateTime createdAt
    }

    class FAQ {
        +String id
        +String question
        +String answer
        +String category
        +Int sortOrder
        +Boolean isPublished
    }

    class Review {
        +String id
        +String productId
        +String userId
        +Int rating
        +String content
        +String status
        +Boolean verifiedPurchase
        +DateTime createdAt
    }

    class ReturnRequest {
        +String id
        +String orderId
        +String userId
        +String status
        +String reason
        +String description
        +String adminNote
        +DateTime createdAt
    }

    class ReturnItem {
        +String id
        +String returnRequestId
        +String orderItemId
        +Int quantity
    }

    class Refund {
        +String id
        +String orderId
        +String returnId
        +String userId
        +Int amountVnd
        +String method
        +String status
        +String reason
        +String adminNote
        +DateTime processedAt
    }

    SupportTicket "1" --> "*" TicketMessage : contains
    ReturnRequest "1" --> "*" ReturnItem : includes
    ReturnRequest "1" --> "0..1" Refund : results_in
    Order "1" --> "0..1" ReturnRequest : returns
```

---

## 19. State Management — Frontend Data Flow

```mermaid
flowchart TB
    subgraph STORES["Client State (Zustand)"]
        AUTH_STORE["AuthStore\n{ isLoggedIn, user,\nlogin(), logout() }"]
        CART_STORE["(Tuỳ MFE)\n{ items, total }"]
    end

    subgraph SERVER_STATE["Server State (TanStack React Query)"]
        QUERY_CACHE["Query Cache\n{ queryKey → data }"]
        PRODUCT_LIST["['products', filters]"]
        PRODUCT_DETAIL["['product', slug]"]
        ORDER_LIST["['my-orders']"]
        NOTIF_FEED["['notification-feed']"]
        WALLET["['wallet']"]
    end

    subgraph MUTATIONS["Mutations"]
        LOGIN_MUT["useMutation\nPOST /auth/login"]
        ORDER_MUT["useMutation\nPOST /orders"]
        REVIEW_MUT["useMutation\nPOST /reviews"]
    end

    subgraph EVENT_BUS["Cross-MFE Events (@lishop/event-bus)"]
        LOGIN_EVT["LishopEvent.LOGIN\n→ AuthStore updated"]
        LOGOUT_EVT["LishopEvent.LOGOUT\n→ Clear stores"]
        CART_UPD["LishopEvent.CART_UPDATED\n→ Update badge"]
        NOTIF_CNT["LishopEvent.NOTIFICATION_COUNT_UPDATED\n→ Update badge"]
    end

    subgraph PERSIST["Persistence"]
        COOKIE["lishop_session cookie\n(hasSessionCookie())"]
        LOCAL_ST["localStorage\nlishop_notification_count"]
    end

    AUTH_STORE -->|"Đọc"| COOKIE
    LOGIN_MUT -->|"onSuccess"| AUTH_STORE
    LOGIN_MUT -->|"onSuccess"| LOGIN_EVT
    LOGOUT_EVT -->|"clear"| AUTH_STORE
    LOGOUT_EVT -->|"invalidate"| QUERY_CACHE

    QUERY_CACHE -->|"refetchOnMount"| PRODUCT_LIST
    QUERY_CACHE -->|"refetchOnMount"| ORDER_LIST

    NOTIF_FEED -->|"SSE → invalidate"| QUERY_CACHE
    NOTIF_FEED -->|"update"| LOCAL_ST
    LOCAL_ST -->|"storage event"| NOTIF_CNT

    EVENT_BUS -->|"subscribe"| MFES[All MFEs]
    MFES -->|"emit"| EVENT_BUS
```

---

## 20. Data Migration & Seed Flow

```mermaid
flowchart LR
    subgraph PRISMA["Prisma CLI"]
        GEN["pnpm db:generate\n→ prisma generate client"]
        MIG["pnpm db:migrate\n→ prisma migrate dev\n→ SQL migrations"]
        SEED["pnpm db:seed\n→ prisma/seed.ts"]
    end

    subgraph FILES["Migration Files"]
        SQL_MIG["prisma/migrations/\n{timestamp}_migration/\nmigration.sql"]
        SCHEMA["prisma/schema.prisma"]
    end

    subgraph DB["Database"]
        PG[(PostgreSQL)]
        META_TBL["_prisma_migrations\n(tracking table)"]
    end

    subgraph DATA["Seed Data"]
        CATS["Categories\n(clothing, electronics,\nhome & garden...)"]
        TAGS["Tags (tags.json)"]
        USERS["Users (admin + test)"]
        PRODUCTS["Products + variants + images"]
        REVIEWS["Reviews (positive + negative\n+ spam for AI demo)"]
        COUPONS["Coupons"]
    end

    SCHEMA --> GEN
    SCHEMA --> MIG
    MIG --> SQL_MIG
    SQL_MIG --> PG
    PG --> META_TBL

    SEED --> CATS
    SEED --> TAGS
    SEED --> USERS
    SEED --> PRODUCTS
    SEED --> REVIEWS
    SEED --> COUPONS

    CATS --> PG
    TAGS --> PG
    USERS --> PG
    PRODUCTS --> PG
    REVIEWS --> PG
    COUPONS --> PG
```

---

*Tạo bởi Mermaid — render trên GitHub, GitLab, hoặc dùng [Mermaid Live Editor](https://mermaid.live/edit) để xem trước.*
