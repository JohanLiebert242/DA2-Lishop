import { Injectable } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { FaqRepository } from './faq.repository';
import { FAQ } from '@lishop/database';

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  averageRating: number;
  primaryImage: string | null;
}

export interface ChatbotResponse {
  reply: string;
  type: 'text' | 'products' | 'faq';
  data?: ProductSummary[] | FAQ[];
}

const PRODUCT_KEYWORDS = ['giá', 'bao nhiêu', 'rẻ nhất', 'đắt nhất', 'tìm', 'sản phẩm'];
const ORDER_KEYWORDS = ['theo dõi', 'tracking', 'đơn hàng', 'kiểm tra đơn'];
const RETURN_KEYWORDS = ['đổi trả', 'hoàn tiền', 'trả hàng', 'refund'];
const SHIPPING_KEYWORDS = ['vận chuyển', 'giao hàng', 'ship', 'phí ship'];
const PAYMENT_KEYWORDS = ['thanh toán', 'payment', 'cod', 'vnpay', 'momo'];
const CONTACT_KEYWORDS = ['liên hệ', 'hỗ trợ', 'gặp người thật', 'tư vấn'];

const CANNED_ORDER = `Để theo dõi đơn hàng, bạn đăng nhập và vào mục "Đơn hàng" trong tài khoản. Mỗi đơn hàng có thông tin cập nhật trạng thái và lịch sử vận chuyển chi tiết.`;

const CANNED_RETURN = `Chính sách đổi trả: Bạn có 7 ngày kể từ khi nhận hàng để yêu cầu đổi trả. Vào mục "Đơn hàng", chọn đơn hàng đã giao và nhấn "Yêu cầu đổi trả". Chúng tôi sẽ xử lý trong vòng 3-5 ngày làm việc.`;

const CANNED_SHIPPING = `Chúng tôi hỗ trợ các đơn vị vận chuyển: GHN (2 ngày), GHTK (3 ngày), Viettel Post (4 ngày). Phí vận chuyển tính theo khu vực và trọng lượng sản phẩm, hiển thị khi thanh toán.`;

const CANNED_PAYMENT = `Chúng tôi chấp nhận: COD (thanh toán khi nhận hàng), VNPAY, MoMo, Stripe, PayPal. Bạn có thể chọn phương thức thanh toán khi đặt hàng.`;

const CANNED_CONTACT = `Bạn cần hỗ trợ trực tiếp từ nhân viên? Vui lòng tạo yêu cầu hỗ trợ trong mục "Hỗ trợ" của tài khoản. Chúng tôi sẽ phản hồi trong vòng 24 giờ.`;

const DEFAULT_REPLY = `Tôi chưa hiểu câu hỏi này. Bạn có thể tạo yêu cầu hỗ trợ trong mục "Hỗ trợ" để được nhân viên tư vấn trực tiếp.`;

@Injectable()
export class ChatbotService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly faqRepo: FaqRepository,
  ) {}

  async reply(message: string): Promise<ChatbotResponse> {
    const lower = message.toLowerCase();

    if (this.matches(lower, PRODUCT_KEYWORDS)) {
      const result = await this.productsService.findMany({ q: message, limit: 5 });
      const data: ProductSummary[] = result.items.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        priceVnd: p.priceVnd,
        averageRating: p.averageRating,
        primaryImage: p.images.find((img) => img.isPrimary)?.url ?? p.images[0]?.url ?? null,
      }));
      return {
        reply: data.length > 0 ? `Tìm thấy ${data.length} sản phẩm phù hợp:` : 'Không tìm thấy sản phẩm phù hợp.',
        type: 'products',
        data,
      };
    }

    if (this.matches(lower, ORDER_KEYWORDS)) {
      return { reply: CANNED_ORDER, type: 'text' };
    }

    if (this.matches(lower, RETURN_KEYWORDS)) {
      return { reply: CANNED_RETURN, type: 'text' };
    }

    if (this.matches(lower, SHIPPING_KEYWORDS)) {
      return { reply: CANNED_SHIPPING, type: 'text' };
    }

    if (this.matches(lower, PAYMENT_KEYWORDS)) {
      return { reply: CANNED_PAYMENT, type: 'text' };
    }

    if (this.matches(lower, CONTACT_KEYWORDS)) {
      return { reply: CANNED_CONTACT, type: 'text' };
    }

    // Fallback: search FAQ
    const faqs = await this.faqRepo.search(message);
    if (faqs.length > 0) {
      return { reply: 'Tìm thấy thông tin liên quan trong FAQ:', type: 'faq', data: faqs };
    }

    return { reply: DEFAULT_REPLY, type: 'text' };
  }

  private matches(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}
