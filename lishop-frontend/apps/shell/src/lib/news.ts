export const NEWS_ITEMS = [
  {
    id: 'daily-coupon',
    title: 'Coupon nhỏ mỗi ngày: săn ưu đãi 5K-50K qua icon chuông',
    summary: 'Lishop mở thông báo coupon hằng ngày để khách hàng chủ động nhận ưu đãi nhỏ trước khi mua sắm.',
    tag: 'Khuyến mãi',
    date: '02/06/2026',
    readTime: '4 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200',
    content: [
      'Mỗi ngày, hệ thống thông báo của Lishop sẽ gợi ý các coupon nhỏ từ 5K đến 50K ngay trên icon chuông ở header. Cách làm này giúp khách hàng nhìn thấy ưu đãi trước khi chuyển sang catalog hoặc trang khuyến mãi.',
      'Những coupon nhỏ phù hợp cho các đơn hàng bổ sung như mỹ phẩm, phụ kiện, sách hoặc đồ gia dụng. Với demo hiện tại, danh sách coupon được tạo ổn định theo ngày để người dùng luôn thấy trải nghiệm nhất quán.',
      'Trong các bước tiếp theo, coupon hằng ngày có thể được nối với scheduler backend hoặc campaign engine để quản trị viên cài đặt khung giờ, số lượng và điều kiện sử dụng.',
    ],
  },
  {
    id: 'premium-order-reward',
    title: 'Đơn từ 30 triệu nhận coupon 10% cho lần mua kế',
    summary: 'Các đơn hàng giá trị cao được tự động tặng mã giảm 10% để tiếp tục mua sắm tiết kiệm hơn.',
    tag: 'Thành viên',
    date: '02/06/2026',
    readTime: '5 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
    content: [
      'Khi khách hàng hoàn tất đơn hàng có tổng giá trị từ 30 triệu đồng trở lên, backend sẽ tự tạo một mã coupon 10% cho lần mua kế tiếp. Mã được tạo riêng theo đơn hàng và gửi qua notification loại khuyến mãi.',
      'Luồng này giúp Lishop giữ chân nhóm khách hàng mua giá trị cao mà không làm gián đoạn checkout. Người mua không cần thao tác thêm, chỉ cần kiểm tra thông báo sau khi đặt hàng thành công.',
      'Ở phiên bản hiện tại, mã coupon được tạo đủ khó đoán và có giới hạn một lượt dùng. Khi schema hỗ trợ ownership coupon, hệ thống có thể khóa mã trực tiếp theo user để tăng tính bảo mật.',
    ],
  },
  {
    id: 'faster-shopping',
    title: 'Trải nghiệm tìm kiếm mới giúp vào catalog nhanh hơn',
    summary: 'Thanh search ở shell chuyển thẳng đến catalog với từ khóa đã nhập, phù hợp kiến trúc micro-frontend.',
    tag: 'Cập nhật',
    date: '02/06/2026',
    readTime: '3 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200',
    content: [
      'Shell hiện đóng vai trò cổng vào của toàn bộ hệ thống. Vì vậy thanh search ở header được thiết kế để nhận từ khóa và chuyển thẳng sang Catalog với query `q`, thay vì giữ logic tìm kiếm riêng trong Shell.',
      'Cách này giữ kiến trúc micro-frontend rõ ràng: Shell tập trung điều hướng, còn Catalog chịu trách nhiệm lọc, phân trang và hiển thị kết quả sản phẩm.',
      'Người dùng có thể tìm từ khóa như serum, laptop hoặc sofa ngay ở trang chủ. Sau khi Enter, Catalog mở đúng URL kết quả để có thể chia sẻ hoặc bookmark.',
    ],
  },
];
