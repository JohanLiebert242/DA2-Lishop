import type {
  OrderStatus, CouponType, TicketStatus, ReviewStatus, PaymentStatus, RefundStatus, RefundMethod,
} from '../../lib/admin-api';

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-800',
};

export const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  PERCENT: 'Phần trăm (%)',
  FIXED: 'Cố định (₫)',
  FREE_SHIPPING: 'Miễn phí vận chuyển',
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Mở',
  IN_PROGRESS: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  ORDER: 'Đơn hàng',
  PRODUCT: 'Sản phẩm',
  SHIPPING: 'Vận chuyển',
  PAYMENT: 'Thanh toán',
  RETURN: 'Đổi trả',
  OTHER: 'Khác',
};

export const FAQ_CATEGORIES = ['ORDER', 'PRODUCT', 'SHIPPING', 'PAYMENT', 'RETURN', 'OTHER'];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export const REVIEW_STATUS_COLORS: Record<ReviewStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export const REVIEW_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export const RETURN_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  RECEIVED: 'Đã nhận hàng',
  COMPLETED: 'Hoàn tất',
};

export const RETURN_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  RECEIVED: 'bg-violet-100 text-violet-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

export const RETURN_NEXT_STATUSES: Record<string, string[]> = {
  PENDING: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED'],
  RECEIVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

export const RETURN_REASON_LABELS: Record<string, string> = {
  DAMAGED: 'Hàng bị hỏng',
  WRONG_ITEM: 'Sai sản phẩm',
  NOT_AS_DESCRIBED: 'Không đúng mô tả',
  CHANGED_MIND: 'Đổi ý',
  OTHER: 'Khác',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thanh toán',
  COMPLETED: 'Đã thanh toán',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  COD: 'Tiền mặt (COD)',
  VNPAY: 'VNPay',
  MOMO: 'MoMo',
  STRIPE: 'Stripe',
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  COMPLETED: 'Hoàn tất',
  FAILED: 'Thất bại',
};

export const REFUND_STATUS_COLORS: Record<RefundStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

export const REFUND_METHOD_LABELS: Record<RefundMethod, string> = {
  WALLET: 'Hoàn vào ví',
  ORIGINAL_PAYMENT: 'Về TT gốc',
  MANUAL: 'Thủ công',
};
