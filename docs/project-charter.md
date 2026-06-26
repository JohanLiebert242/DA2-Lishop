# Project Charter — Lishop

## 1. Tổng quan dự án (Project Overview)

| Mục | Nội dung |
|---|---|
| **Tên dự án** | Lishop — Nền tảng thương mại điện tử đa kênh thông minh |
| **Tên tiếng Anh** | Lishop — Smart Multi-channel E-commerce Platform |
| **Mã dự án** | LISHOP-2025 |
| **Version** | 1.0.0 |

Lishop là một nền tảng thương mại điện tử (marketplace) hiện đại, hướng đến thị trường Việt Nam, tích hợp các phương thức thanh toán nội địa (VNPAY, MoMo, ZaloPay) và quốc tế (Stripe, PayPal), cùng các đơn vị vận chuyển trong nước (GHN, GHTK, Viettel Post). Nền tảng ứng dụng AI (GPT-5.2) để nâng cao trải nghiệm mua sắm, vận hành và phân tích dữ liệu.

---

## 2. Lý do kinh doanh (Business Case)

### Vấn đề
- Thị trường thương mại điện tử Việt Nam tăng trưởng nhanh (~20%/năm) nhưng các nền tảng phổ biến (Shopee, Lazada, Tiki) thu phí cao, kiểm soát dữ liệu người bán, và hạn chế tùy biến.
- Người bán mong muốn một nền tảng minh bạch, chi phí hợp lý, tích hợp sẵn các công cụ AI để tự động hóa vận hành.
- Người mua cần trải nghiệm mua sắm thông minh, cá nhân hóa và thanh toán thuận tiện.

### Cơ hội
- Xây dựng nền tảng marketplace độc lập, tập trung vào trải nghiệm AI-powered.
- Tích hợp sâu với các dịch vụ địa phương (VNPAY, MoMo, GHN, GHTK).
- Mô hình micro-frontend cho phép mở rộng linh hoạt, dễ dàng thêm tính năng mới.

### Mục tiêu kinh doanh
- Đạt 10.000 người dùng đăng ký trong 6 tháng đầu.
- Hỗ trợ 500+ shop người bán trong năm đầu tiên.
- Tỷ lệ chuyển đổi giỏ hàng > 3%.
- Thời gian uptime ≥ 99.9%.

---

## 3. Tầm nhìn và Mục tiêu (Vision & Goals)

### Tầm nhìn
Trở thành nền tảng thương mại điện tử thông minh hàng đầu Việt Nam, nơi người mua và người bán được kết nối qua trải nghiệm mua sắm được cá nhân hóa bởi AI.

### Sứ mệnh
Cung cấp một hệ sinh thái mua sắm toàn diện, tích hợp AI vào mọi khâu — từ tìm kiếm sản phẩm, tư vấn mua sắm đến vận hành shop và phân tích dữ liệu — giúp việc mua bán trực tuyến trở nên thông minh, nhanh chóng và hiệu quả.

### Mục tiêu cụ thể (OKRs)

| Mục tiêu (Objective) | Kết quả then chốt (Key Results) |
|---|---|
| **Tăng trưởng người dùng** | 10K registered users, 500+ sellers, 50K monthly active users |
| **Trải nghiệm mua sắm** | Cart conversion > 3%, avg. page load < 1.5s, CSAT ≥ 4.5/5 |
| **AI Adoption** | 8+ AI features with > 30% user engagement |
| **Ổn định hệ thống** | Uptime 99.9%, API response < 200ms p95 |
| **Tài chính** | Positive unit economics by month 9 |

---

## 4. Phạm vi dự án (Scope)

### Trong phạm vi (In-Scope)

**Người mua (Buyer)**
- Đăng ký/đăng nhập (email, Google, Facebook)
- Duyệt tìm sản phẩm, danh mục, bộ lọc
- Tìm kiếm bằng ngôn ngữ tự nhiên (AI)
- Giỏ hàng, thanh toán (7 phương thức), đặt hàng
- Theo dõi đơn hàng, lịch sử mua hàng
- Ví điện tử, tích điểm, mã giảm giá, flash sales
- Đánh giá sản phẩm, trả hàng/hoàn tiền
- Chat hỗ trợ (AI chatbot + ticket)
- Danh sách yêu thích

**Người bán (Seller)**
- Đăng ký shop, quản lý hồ sơ shop
- Quản lý sản phẩm, tồn kho
- Xem đơn hàng, cập nhật trạng thái
- Quản lý vận chuyển
- Chat với người mua
- Dashboard thống kê doanh thu (AI-powered analytics)

**Quản trị viên (Admin)**
- Dashboard tổng quan (realtime analytics)
- Quản lý người dùng, shop, sản phẩm, đơn hàng
- Quản lý khuyến mãi, flash sales
- Quản lý đánh giá (AI moderation)
- Quản lý hoàn tiền
- Quản lý thanh toán & ví
- Quản lý nội dung (FAQ, categories)
- Quản lý vận chuyển

**AI Features (8+ tính năng)**
1. Product Discovery — Tìm kiếm sản phẩm bằng ngôn ngữ tự nhiên
2. Shopping Concierge — Chatbot tư vấn mua sắm
3. Style Advisor — Gợi ý phong cách thời trang
4. Personalized Recommendations — Gợi ý sản phẩng cá nhân hóa
5. Analytics Insights — Phân tích xu hướng & bất thường trong dashboard
6. Product Copywriting — Tạo mô tả sản phẩm bằng AI
7. Review Moderation — Kiểm duyệt đánh giá tự động
8. Support Ticket Assistant — Hỗ trợ trả lời ticket

### Ngoài phạm vi (Out-of-Scope)
- Ứng dụng mobile native (iOS/Android) — chỉ PWA tại giai đoạn này
- Hệ thống logistics tự vận hành (dùng đối tác GHN/GHTK/Viettel Post)
- Hệ thống POS offline
- Marketplace cho dịch vụ (service marketplace)
- Tích hợp sàn thương mại điện tử khác (Shopee, Lazada API)
- Hệ thống quản lý kho (WMS) chuyên sâu

---

## 5. Kiến trúc tổng quan (Architecture Overview)

```
┌─────────────────────────────────────────────────────────┐
│                    Người dùng (Browser)                   │
├─────────────────────────────────────────────────────────┤
│                  Nginx Reverse Proxy                      │
├──────────────┬────────────────────────────────┬─────────┤
│  mfe-shell   │  mfe-{auth,catalog,cart,...}   │ mfe-admin│
│   (port 3010)│   (ports 3001-3011)            │ (port3009)│
├──────────────┴────────────────────────────────┴─────────┤
│                  Module Federation v8                     │
├─────────────────────────────────────────────────────────┤
│           @lishop/ui | @lishop/shared | @lishop/contracts│
├─────────────────────────────────────────────────────────┤
│              NestJS API (Fastify, port 4000)              │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Auth     │ Products │ Orders   │ Payments │ ... 22 more │
│ Module   │ Module   │ Module   │ Module   │   Modules   │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│    Prisma ORM    │  Redis (Cache/Queue)  │  MeiliSearch  │
├──────────────────┴──────────────────────┴───────────────┤
│                    PostgreSQL 16                          │
├─────────────────────────────────────────────────────────┤
│  AI Layer (OpenAI GPT-5.2)  │  Payment Gateways (7)    │
│                            │  Shipping Carriers (3)     │
└─────────────────────────────────────────────────────────┘
```

### Công nghệ cốt lõi

| Layer | Công nghệ |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, Radix UI |
| Micro Frontend | Module Federation v8 |
| Backend | NestJS 10 + Fastify, TypeScript |
| Database | PostgreSQL 16 + Prisma 5 |
| Cache/Queue | Redis 7 + BullMQ |
| Search | MeiliSearch |
| AI | OpenAI Responses API (GPT-5.2) |
| Payments | VNPAY, MoMo, ZaloPay, Stripe, PayPal, Wallet, COD |
| Shipping | GHN, GHTK, Viettel Post |
| Real-time | Socket.IO, SSE |
| Container | Docker Compose |
| CI/CD | GitHub Actions |

---

## 6. Các bên liên quan (Stakeholders)

| Vai trò | Đối tượng | Trách nhiệm |
|---|---|---|
| **Chủ đầu tư / Product Owner** | Nội bộ team | Định hướng sản phẩm, phê duyệt tính năng |
| **Technical Lead** | Nội bộ team | Kiến trúc hệ thống, code review, kỹ thuật |
| **Backend Developer** | Nội bộ team | Phát triển NestJS API (26 modules) |
| **Frontend Developer** | Nội bộ team | Phát triển Next.js MFE (10 apps) |
| **AI Engineer** | Nội bộ team | Tích hợp & tối ưu AI features |
| **DevOps** | Nội bộ team | CI/CD, infra, monitoring |
| **QA / Tester** | Nội bộ team | Unit test, E2E test, regression |
| **Người mua (Buyer)** | Người dùng cuối | Trải nghiệm mua sắm |
| **Người bán (Seller)** | Đối tác | Quản lý shop, bán hàng |
| **Admin** | Nội bộ vận hành | Quản lý hệ thống |

---

## 7. Lịch trình & Cột mốc (Timeline & Milestones)

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **Phase 0 — Foundation** | Architecture, DB schema, monorepo setup, Docker, CI/CD | ✅ Complete |
| **Phase 1 — Core Shopping** | Auth, Products, Cart, Checkout, Orders + basic payments | ✅ Complete |
| **Phase 2 — Marketplace** | Shops, Seller flow, Admin dashboard, Shipping | ✅ Complete |
| **Phase 3 — AI Superpowers** | 8 AI features: Discovery, Concierge, Style, Recommendations, Analytics, Copywriting, Moderation, Ticket | ✅ Complete |
| **Phase 4 — Advanced Features** | Flash sales, Coupons, Wallet, Returns/Refunds, Invoices, Reviews | ✅ Complete |
| **Phase 5 — Communication** | Notifications (email + realtime), Support tickets, Shop chat | ✅ Complete |
| **Phase 6 — Polish & Scale** | E2E testing, Performance optimization, Security audit, Documentation | In Progress |

---

## 8. Constraints & Assumptions

### Constraints (Ràng buộc)
- **Công nghệ**: Backend bắt buộc NestJS + Fastify; Frontend bắt buộc Next.js + Module Federation.
- **Database**: PostgreSQL 16, không dùng database khác.
- **AI Model**: Chỉ dùng OpenAI Responses API (GPT-5.2).
- **Hosting**: Triển khai trên VPS/dedicated server (không dùng serverless cho backend).
- **Ngôn ngữ UI**: Hỗ trợ tiếng Việt (chính) và tiếng Anh (phụ).
- **Tiền tệ**: VND là đơn vị chính, USD là đơn vị phụ.

### Assumptions (Giả định)
- Người dùng có trình duyệt hiện đại hỗ trợ ES2020+.
- API của các đối tác (VNPAY, MoMo, GHN, ...) hoạt động ổn định.
- OpenAI API available tại thị trường Việt Nam.
- Người dùng có kết nối Internet ổn định.
- Dữ liệu seed đủ realistic để test và demo.

---

## 9. Rủi ro & Giảm thiểu (Risks & Mitigations)

| Rủi ro | Tác động | Khả năng | Giảm thiểu |
|---|---|---|---|
| API đối tác thay đổi (VNPAY, GHN...) | Cao | Trung bình | Tầng abstraction cho mỗi tích hợp, kiểm tra định kỳ |
| Chi phí OpenAI vượt ngân sách | Cao | Thấp | Rate limiting, caching responses, fallback rule-based |
| Bảo mật thanh toán | Cao | Thấp | httpOnly cookies, rate limiting, OWASP audit, PSTN encryption |
| Hiệu năng MFE (tải nhiều app) | Trung bình | Trung bình | Lazy loading, Module Federation shared deps, Nginx caching |
| Migration Prisma với DB production | Trung bình | Trung bình | Migration plan, backup, staging environment, rollback script |
| Seller adoption thấp | Cao | Trung bình | Onboarding flow, tài liệu hướng dẫn, hỗ trợ AI |

---

## 10. Tiêu chí thành công (Success Criteria)

### Tiêu chí bắt buộc (Must-have)
- [x] Người dùng có thể đăng ký, đăng nhập, duyệt sản phẩm, đặt hàng và thanh toán.
- [x] Người bán có thể đăng ký shop, quản lý sản phẩm và xem đơn hàng.
- [x] Admin có thể quản lý toàn bộ hệ thống qua dashboard.
- [x] Hệ thống hỗ trợ 7 phương thức thanh toán và 3 đơn vị vận chuyển.
- [x] Tích hợp ít nhất 5 AI features hoạt động ổn định.
- [x] Hỗ trợ song ngữ Việt-Anh.
- [ ] E2E test coverage cho critical paths (checkout, payment, auth).
- [ ] Security audit không có critical/high vulnerabilities.

### Tiêu chí mong muốn (Nice-to-have)
- [ ] Performance: Lighthouse score ≥ 90 cho tất cả MFE.
- [ ] 100% unit test coverage cho service layer.
- [ ] API documentation (Swagger) đầy đủ cho tất cả endpoints.
- [ ] Backup & disaster recovery plan.

---

## 11. Tài nguyên & Ngân sách (Resources & Budget)

### Tài nguyên phần cứng
| Component | Spec |
|---|---|
| Development | Local machine (Windows, Node.js 22) |
| Database | Docker PostgreSQL 16 |
| Cache | Docker Redis 7 |
| Search | Docker MeiliSearch |
| CI/CD | GitHub Actions |

### Công cụ & Dịch vụ
| Công cụ | Mục đích |
|---|---|
| Turborepo + pnpm | Monorepo management |
| Docker Compose | Local development environment |
| OpenAI API | AI features |
| GitHub Actions | CI/CD |
| Playwright | E2E testing |

---

## 12. Phê duyệt (Approval)

| Vai trò | Họ tên | Ngày | Chữ ký |
|---|---|---|---|
| Product Owner | — | — | — |
| Technical Lead | — | — | — |

---

*Tài liệu này được tạo ngày 26/06/2026 và có thể được cập nhật khi dự án tiến triển.*
