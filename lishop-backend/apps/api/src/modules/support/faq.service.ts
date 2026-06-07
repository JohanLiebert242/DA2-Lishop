import { Injectable, NotFoundException } from '@nestjs/common';
import { FAQ } from '@lishop/database';
import { FaqRepository } from './faq.repository';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

export interface FaqGroup {
  category: string;
  items: FAQ[];
}

const now = new Date(0);
const DEFAULT_FAQS: FAQ[] = [
  {
    id: 'default-faq-order-tracking',
    question: 'Làm sao để theo dõi đơn hàng?',
    answer: 'Vào mục Đơn hàng của tôi để xem trạng thái xử lý, vận chuyển và lịch sử cập nhật của từng đơn.',
    category: 'ORDER',
    sortOrder: 1,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-order-cancel',
    question: 'Tôi có thể hủy đơn hàng không?',
    answer: 'Bạn có thể hủy đơn khi đơn chưa được bàn giao cho đơn vị vận chuyển. Nếu đơn đã giao vận, vui lòng tạo yêu cầu hỗ trợ.',
    category: 'ORDER',
    sortOrder: 2,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-shipping-time',
    question: 'Thời gian giao hàng mất bao lâu?',
    answer: 'Đơn nội thành thường giao trong 1-2 ngày làm việc. Các khu vực khác thường mất 2-5 ngày tùy địa chỉ và đơn vị vận chuyển.',
    category: 'SHIPPING',
    sortOrder: 3,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-shipping-address',
    question: 'Tôi có thể đổi địa chỉ giao hàng sau khi đặt không?',
    answer: 'Nếu đơn chưa chuyển sang trạng thái đang giao, bạn có thể liên hệ hỗ trợ để cập nhật địa chỉ nhận hàng.',
    category: 'SHIPPING',
    sortOrder: 4,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-payment-methods',
    question: 'Lishop hỗ trợ phương thức thanh toán nào?',
    answer: 'Lishop hỗ trợ COD, ví Lishop, VNPAY, MOMO và các phương thức thanh toán trực tuyến được hiển thị ở trang thanh toán.',
    category: 'PAYMENT',
    sortOrder: 5,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-wallet-topup',
    question: 'Nạp tiền vào ví Lishop mất bao lâu?',
    answer: 'Sau khi bạn chuyển khoản đúng số tiền và nội dung, ví sẽ được cộng khi giao dịch được xác nhận.',
    category: 'PAYMENT',
    sortOrder: 6,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-return-policy',
    question: 'Điều kiện đổi trả sản phẩm là gì?',
    answer: 'Sản phẩm cần còn trong thời hạn đổi trả, đúng tình trạng theo chính sách và có bằng chứng hình ảnh hoặc video khi cần.',
    category: 'RETURN',
    sortOrder: 7,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-refund-time',
    question: 'Khi nào tôi nhận được hoàn tiền?',
    answer: 'Sau khi yêu cầu được duyệt, tiền hoàn sẽ được xử lý về ví Lishop hoặc phương thức thanh toán phù hợp trong thời gian xử lý của hệ thống.',
    category: 'REFUND',
    sortOrder: 8,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-coupon-save',
    question: 'Lưu mã giảm giá rồi dùng ở đâu?',
    answer: 'Mã đã lưu sẽ xuất hiện trong khu vực mã giảm giá khi bạn đặt hàng, nếu đơn đáp ứng điều kiện áp dụng.',
    category: 'PROMOTION',
    sortOrder: 9,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'default-faq-support-ticket',
    question: 'Khi nào nên tạo yêu cầu hỗ trợ?',
    answer: 'Hãy tạo yêu cầu hỗ trợ khi bạn cần kiểm tra đơn hàng, thanh toán, đổi trả, hoàn tiền hoặc vấn đề tài khoản cần nhân viên xử lý.',
    category: 'SUPPORT',
    sortOrder: 10,
    isPublished: true,
    createdAt: now,
    updatedAt: now,
  },
];

@Injectable()
export class FaqService {
  constructor(private readonly repo: FaqRepository) {}

  async getPublished(): Promise<FaqGroup[]> {
    const faqs = await this.repo.findPublished();
    return this.groupByCategory(faqs.length > 0 ? faqs : DEFAULT_FAQS);
  }

  async search(q: string): Promise<FAQ[]> {
    const results = await this.repo.search(q);
    if (results.length > 0) return results;

    const normalized = this.normalize(q);
    if (!normalized) return DEFAULT_FAQS;

    return DEFAULT_FAQS.filter((faq) => {
      const haystack = this.normalize(`${faq.question} ${faq.answer} ${faq.category}`);
      return haystack.includes(normalized);
    });
  }

  findAll(): Promise<FAQ[]> {
    return this.repo.findAll();
  }

  create(dto: CreateFaqDto): Promise<FAQ> {
    return this.repo.create({
      question: dto.question,
      answer: dto.answer,
      category: dto.category,
      sortOrder: dto.sortOrder ?? 0,
      isPublished: dto.isPublished ?? true,
    });
  }

  async update(id: string, dto: UpdateFaqDto): Promise<FAQ> {
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ không tồn tại');
    return this.repo.update(id, dto);
  }

  async delete(id: string): Promise<FAQ> {
    const faq = await this.repo.findById(id);
    if (!faq) throw new NotFoundException('FAQ không tồn tại');
    return this.repo.delete(id);
  }

  private groupByCategory(faqs: FAQ[]): FaqGroup[] {
    const map = new Map<string, FAQ[]>();
    for (const faq of faqs) {
      const group = map.get(faq.category) ?? [];
      group.push(faq);
      map.set(faq.category, group);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
