import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { FaqRepository } from './faq.repository';
import { FAQ } from '@lishop/database';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_OPENAI_MODEL, requestOpenAiText } from '../../common/ai/openai-responses';

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

const PRODUCT_KEYWORDS = ['gia', 'bao nhieu', 're nhat', 'dat nhat', 'tim', 'san pham', 'tu van', 'mua', 'nen chon'];
const HOT_KEYWORDS = ['hot', 'noi bat', 'ban chay', 'pho bien', 'goi y', 'thinh hanh', 'xu huong', 'trending'];
const COMPARE_KEYWORDS = ['so sanh', 'khac nhau', 'hon', 'doi chieu', 'compare'];
const ORDER_KEYWORDS = ['theo doi', 'tracking', 'don hang', 'kiem tra don'];
const RETURN_KEYWORDS = ['doi tra', 'hoan tien', 'tra hang', 'refund'];
const SHIPPING_KEYWORDS = ['van chuyen', 'giao hang', 'ship', 'phi ship'];
const PAYMENT_KEYWORDS = ['thanh toan', 'payment', 'cod', 'vnpay', 'momo'];
const CONTACT_KEYWORDS = ['lien he', 'ho tro', 'gap nguoi that', 'tu van'];

const CANNED_ORDER = 'Để theo dõi đơn hàng, bạn đăng nhập và vào mục "Đơn hàng" trong tài khoản. Mỗi đơn hàng có thông tin cập nhật trạng thái và lịch sử vận chuyển chi tiết.';
const CANNED_RETURN = 'Chính sách đổi trả: Bạn có 7 ngày kể từ khi nhận hàng để yêu cầu đổi trả. Vào mục "Đơn hàng", chọn đơn hàng đã giao và nhấn "Yêu cầu đổi trả". Chúng tôi sẽ xử lý trong vòng 3-5 ngày làm việc.';
const CANNED_SHIPPING = 'Chúng tôi hỗ trợ các đơn vị vận chuyển: GHN (2 ngày), GHTK (3 ngày), Viettel Post (4 ngày). Phí vận chuyển tính theo khu vực và trọng lượng sản phẩm, hiển thị khi thanh toán.';
const CANNED_PAYMENT = 'Chúng tôi chấp nhận: COD, VNPAY, MoMo, Stripe, PayPal. Bạn có thể chọn phương thức thanh toán khi đặt hàng.';
const CANNED_CONTACT = 'Bạn cần hỗ trợ trực tiếp từ nhân viên? Vui lòng tạo yêu cầu hỗ trợ trong mục "Hỗ trợ" của tài khoản. Chúng tôi sẽ phản hồi trong vòng 24 giờ.';
const DEFAULT_REPLY = 'Tôi chưa hiểu câu hỏi này. Bạn có thể tạo yêu cầu hỗ trợ trong mục "Hỗ trợ" để được nhân viên tư vấn trực tiếp.';

@Injectable()
export class ChatbotService {
  constructor(
    private readonly productsService: ProductsService,
    private readonly faqRepo: FaqRepository,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly redisService: RedisService,
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
    const cacheKey = this.buildCacheKey(message, context, aiContext);
    const cached = await this.readCachedJson<{ reply: string }>(cacheKey);
    const reply = cached?.reply ?? await requestOpenAiText({
      apiKey,
      model: this.config.get<string>('OPENAI_MODEL') || DEFAULT_OPENAI_MODEL,
      instructions: this.buildSystemPrompt(),
      inputText: [
        `Cau hoi khach hang: ${message}`,
        '',
        'Du lieu noi bo Lishop dang JSON. Chi dung du lieu nay khi noi ve san pham, chinh sach, hoac don hang:',
        JSON.stringify(this.toPromptContext(aiContext), null, 2),
      ].join('\n'),
      maxOutputTokens: 700,
      requestLabel: 'support.chatbot',
      logger: console,
    });

    if (!cached) {
      await this.writeCachedJson(cacheKey, { reply }, 60);
    }

    if (aiContext.products.length > 0 && this.matches(lower, [...PRODUCT_KEYWORDS, ...HOT_KEYWORDS, ...COMPARE_KEYWORDS])) {
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
    const wantsHot = this.matches(lower, HOT_KEYWORDS);
    const wantsOrders = this.matches(lower, ORDER_KEYWORDS);
    const wantsFaq = this.matches(lower, [...RETURN_KEYWORDS, ...SHIPPING_KEYWORDS, ...PAYMENT_KEYWORDS, ...CONTACT_KEYWORDS]);

    const [productsResult, faqs, orders] = await Promise.all([
      wantsProducts
        ? wantsHot
          ? this.productsService.findFeatured(8).then((items) => ({ items, nextCursor: null }))
          : this.productsService.findMany({ q: message, limit: 5 })
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
      'Ban la tro ly AI cham soc khach hang cua Lishop.',
      'Luon tra loi bang tieng Viet co dau, tu nhien, than thien, ngan gon nhung du y.',
      'Khi tu van hoac so sanh san pham, chi dua vao danh sach san pham trong du lieu noi bo.',
      'Khi noi ve don hang, chi dung du lieu don hang duoc cung cap.',
      'Khong bua ma van don, trang thai don hang, chinh sach, gia, ton kho hoac khuyen mai.',
      'Neu cau hoi nam ngoai du lieu Lishop, tra loi huu ich o muc tong quat va khuyen khich tao ticket khi can nhan vien ho tro.',
    ].join('\n');
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

    if (this.matches(lower, HOT_KEYWORDS)) {
      const products = await this.productsService.findFeatured(8);
      const data: ProductSummary[] = products.map((p) => this.toProductSummary(p as any));
      return {
        reply: data.length > 0
          ? `Dưới đây là ${data.length} sản phẩm nổi bật tại Lishop:`
          : 'Hiện chưa có sản phẩm nổi bật nào.',
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

    const faqs = await this.faqRepo.search(message);
    if (faqs.length > 0) {
      return { reply: 'Tìm thấy thông tin liên quan trong FAQ:', type: 'faq', data: faqs };
    }

    return { reply: DEFAULT_REPLY, type: 'text' };
  }

  private toPromptContext(aiContext: AiContext) {
    return {
      products: aiContext.products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        priceVnd: product.priceVnd,
        averageRating: product.averageRating,
        brand: product.brand,
        stock: product.stock,
      })),
      faqs: aiContext.faqs.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      })),
      orders: aiContext.orders,
      orderTrackingRequiresLogin: aiContext.orderTrackingRequiresLogin,
    };
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

  private buildCacheKey(message: string, context: ChatbotReplyContext, aiContext: AiContext) {
    return [
      'cache:ai:chatbot',
      this.normalizeText(message).replace(/\s+/g, '-'),
      context.userId ?? 'guest',
      aiContext.products.map((product) => product.slug).join(',') || '-',
      aiContext.faqs.map((faq) => faq.id).join(',') || '-',
      aiContext.orders.map((order) => order.orderNumber).join(',') || '-',
      aiContext.orderTrackingRequiresLogin ? 'login' : 'ready',
    ].join(':').slice(0, 240);
  }

  private async readCachedJson<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.redisService.get(key);
      return cached ? JSON.parse(cached) as T : null;
    } catch {
      return null;
    }
  }

  private async writeCachedJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redisService.setex(key, ttlSeconds, JSON.stringify(value));
    } catch {
      // ignore cache write failures
    }
  }
}
