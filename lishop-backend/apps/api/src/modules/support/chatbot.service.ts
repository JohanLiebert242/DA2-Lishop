import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { FaqRepository } from './faq.repository';
import { FAQ } from '@lishop/database';

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  priceVnd: number;
  averageRating: number;
  primaryImage: string | null;
  imageUrl?: string | null;
  brand?: string;
  stock?: number;
  description?: string | null;
}

export interface ChatbotResponse {
  reply: string;
  type: 'text' | 'products' | 'faq';
  data?: ProductSummary[] | FAQ[];
}

export interface ChatbotReplyContext {
  userId?: string;
}

interface AiContext {
  products: ProductSummary[];
  faqs: FAQ[];
  orders: Array<{
    orderNumber: string;
    status: string;
    shippingProvider: string;
    trackingNumber: string | null;
    totalVnd: number;
    createdAt: string;
    deliveredAt: string | null;
    items: { productName: string; quantity: number }[];
  }>;
  orderTrackingRequiresLogin: boolean;
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_OPENAI_MODEL = 'gpt-5.2';

const PRODUCT_KEYWORDS = ['giá', 'bao nhiêu', 'rẻ nhất', 'đắt nhất', 'tìm', 'sản phẩm', 'tư vấn', 'mua', 'nên chọn'];
const COMPARE_KEYWORDS = ['so sánh', 'khác nhau', 'hơn', 'đối chiếu', 'compare'];
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
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  async reply(message: string, context: ChatbotReplyContext = {}): Promise<ChatbotResponse> {
    const aiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();
    if (aiKey) {
      try {
        return await this.replyWithAi(message, aiKey, context);
      } catch (err) {
        console.error('[ChatbotService] OpenAI response failed; falling back to rule-based bot', err);
      }
    }
    return this.replyWithRules(message);
  }

  private async replyWithAi(
    message: string,
    apiKey: string,
    context: ChatbotReplyContext,
  ): Promise<ChatbotResponse> {
    const lower = message.toLowerCase();
    const aiContext = await this.buildAiContext(message, lower, context);
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
        instructions: this.buildSystemPrompt(),
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: [
                  `Câu hỏi khách hàng: ${message}`,
                  '',
                  'Dữ liệu nội bộ Lishop dạng JSON. Chỉ dùng dữ liệu này khi nói về sản phẩm, chính sách, hoặc đơn hàng:',
                  JSON.stringify(aiContext, null, 2),
                ].join('\n'),
              },
            ],
          },
        ],
        max_output_tokens: 700,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }

    const payload = await response.json() as { output_text?: string; output?: unknown };
    const reply = this.extractOutputText(payload).trim();
    if (!reply) throw new Error('OpenAI response did not include text output');

    if (aiContext.products.length > 0 && this.matches(lower, [...PRODUCT_KEYWORDS, ...COMPARE_KEYWORDS])) {
      return { reply, type: 'products', data: aiContext.products };
    }
    if (aiContext.faqs.length > 0 && this.matches(lower, RETURN_KEYWORDS)) {
      return { reply, type: 'faq', data: aiContext.faqs };
    }
    return { reply, type: 'text' };
  }

  private async buildAiContext(
    message: string,
    lower: string,
    context: ChatbotReplyContext,
  ): Promise<AiContext> {
    const wantsProducts = this.matches(lower, [...PRODUCT_KEYWORDS, ...COMPARE_KEYWORDS]);
    const wantsOrders = this.matches(lower, ORDER_KEYWORDS);
    const wantsFaq = this.matches(lower, [...RETURN_KEYWORDS, ...SHIPPING_KEYWORDS, ...PAYMENT_KEYWORDS, ...CONTACT_KEYWORDS]);

    const [productsResult, faqs, orders] = await Promise.all([
      wantsProducts
        ? this.productsService.findMany({ q: message, limit: 5 })
        : Promise.resolve({ items: [], nextCursor: null }),
      wantsFaq ? this.faqRepo.search(message) : Promise.resolve([]),
      wantsOrders && context.userId
        ? this.ordersService.findMyOrders(context.userId)
        : Promise.resolve([]),
    ]);

    return {
      products: productsResult.items.map((p) => this.toProductSummary(p)),
      faqs,
      orders: orders.slice(0, 5).map((order) => ({
        orderNumber: order.orderNumber,
        status: order.status,
        shippingProvider: order.shippingProvider,
        trackingNumber: order.trackingNumber,
        totalVnd: order.totalVnd,
        createdAt: order.createdAt.toISOString(),
        deliveredAt: order.shipment?.deliveredAt?.toISOString() ?? null,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
        })),
      })),
      orderTrackingRequiresLogin: wantsOrders && !context.userId,
    };
  }

  private buildSystemPrompt(): string {
    return [
      'Bạn là trợ lý AI chăm sóc khách hàng của Lishop, một sàn thương mại điện tử.',
      'Luôn trả lời bằng tiếng Việt tự nhiên, thân thiện, ngắn gọn nhưng đủ ý.',
      'Bạn có thể trả lời câu hỏi chung, tư vấn sản phẩm, so sánh sản phẩm, hướng dẫn theo dõi đơn hàng, hướng dẫn đổi trả, thanh toán và vận chuyển.',
      'Khi tư vấn hoặc so sánh sản phẩm, chỉ dựa vào danh sách sản phẩm trong dữ liệu nội bộ. Nếu thiếu dữ liệu, hãy hỏi thêm nhu cầu, ngân sách, thương hiệu hoặc tính năng mong muốn.',
      'Khi nói về đơn hàng, chỉ dùng dữ liệu đơn hàng được cung cấp. Nếu khách chưa đăng nhập hoặc không có dữ liệu đơn hàng, hướng dẫn họ đăng nhập và vào mục Đơn hàng hoặc tạo yêu cầu hỗ trợ.',
      'Không bịa mã vận đơn, trạng thái đơn hàng, chính sách, giá, tồn kho hoặc khuyến mãi.',
      'Nếu câu hỏi nằm ngoài dữ liệu Lishop, trả lời hữu ích ở mức tổng quát và khuyến khích tạo ticket khi cần nhân viên hỗ trợ.',
    ].join('\n');
  }

  private extractOutputText(payload: { output_text?: string; output?: unknown }): string {
    if (typeof payload.output_text === 'string') return payload.output_text;
    if (!Array.isArray(payload.output)) return '';

    const parts: string[] = [];
    for (const item of payload.output) {
      if (!item || typeof item !== 'object') continue;
      const content = (item as { content?: unknown }).content;
      if (!Array.isArray(content)) continue;
      for (const contentItem of content) {
        if (!contentItem || typeof contentItem !== 'object') continue;
        const text = (contentItem as { text?: unknown }).text;
        if (typeof text === 'string') parts.push(text);
      }
    }
    return parts.join('\n');
  }

  private async replyWithRules(message: string): Promise<ChatbotResponse> {
    const lower = message.toLowerCase();

    if (this.matches(lower, PRODUCT_KEYWORDS)) {
      const result = await this.productsService.findMany({ q: message, limit: 5 });
      const data: ProductSummary[] = result.items.map((p) => this.toProductSummary(p));
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

  private toProductSummary(p: {
    id: string;
    name: string;
    slug: string;
    priceVnd: number;
    averageRating: number;
    stock?: number;
    description?: string | null;
    brand?: string;
    images: { url: string; isPrimary: boolean }[];
  }): ProductSummary {
    const primaryImage = p.images.find((img) => img.isPrimary)?.url ?? p.images[0]?.url ?? null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceVnd: p.priceVnd,
      averageRating: p.averageRating,
      primaryImage,
      imageUrl: primaryImage,
      brand: p.brand,
      stock: p.stock,
      description: p.description,
    };
  }

  private matches(text: string, keywords: string[]): boolean {
    const normalizedText = this.normalizeText(text);
    return keywords.some((kw) => normalizedText.includes(this.normalizeText(kw)));
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
  }
}
