export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  tag: string;
  date: string;
  readTime: string;
  imageUrl: string;
  content: string[];
}

export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'daily-coupon',
    title: 'Coupon nhỏ mỗi ngày: săn ưu đãi 5K-50K qua icon chuông',
    summary: 'Lishop mở thông báo coupon hằng ngày để khách hàng chủ động nhận ưu đãi nhỏ trước khi mua sắm.',
    tag: 'Khuyến mãi',
    date: '02/06/2026',
    readTime: '7 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1200',
    content: [
      'Lishop đang chuyển trải nghiệm khuyến mãi từ kiểu người dùng phải tự đi tìm mã sang mô hình chủ động nhắc đúng lúc. Mỗi ngày, khu vực icon chuông ở header sẽ hiển thị một nhóm coupon nhỏ có giá trị từ 5K đến 50K. Đây là các ưu đãi nhẹ, dễ dùng, phù hợp với những đơn hàng bổ sung như mỹ phẩm, phụ kiện, đồ gia dụng nhỏ, văn phòng phẩm hoặc các sản phẩm đang có nhu cầu mua lặp lại.',
      'Điểm quan trọng của cơ chế này là coupon được đặt ngay trong luồng mua sắm. Người dùng không cần rời khỏi trang chủ để kiểm tra khuyến mãi, cũng không cần nhớ mã từ email hay banner riêng. Khi mở chuông thông báo, họ thấy mã, giá trị giảm, mô tả điều kiện sử dụng và đường dẫn sang trang khuyến mãi. Điều này giúp giảm độ ma sát trước khi vào catalog hoặc checkout.',
      'Ở bản hiện tại, danh sách coupon hằng ngày được tạo ổn định theo ngày để trải nghiệm demo luôn nhất quán. Cách này phù hợp cho giai đoạn thử nghiệm UI và hành vi người dùng. Khi đưa vào vận hành thật, phần này có thể nối với campaign engine ở backend để admin cấu hình thời gian bắt đầu, thời gian kết thúc, số lượng mã, phân khúc khách hàng, điều kiện danh mục và mức giảm tối đa.',
      'Về mặt nghiệp vụ, coupon nhỏ không nên thay thế các chiến dịch lớn như flash sale. Vai trò của nó là tạo cảm giác luôn có một lợi ích nhỏ đang chờ người dùng, đặc biệt trong các phiên truy cập ngắn. Với những khách hàng chưa quyết định mua ngay, một mã 10K hoặc miễn phí vận chuyển có thể là tín hiệu đủ để họ thêm sản phẩm vào giỏ và quay lại hoàn tất đơn.',
      'Hệ thống thông báo cũng cần kiểm soát tần suất để không gây phiền. Một hướng tốt là gom coupon trong một cụm thông báo, chỉ hiển thị số lượng mới trên badge, và cho phép người dùng tắt nhóm thông báo khuyến mãi trong trang cài đặt. Như vậy Lishop vừa giữ được hiệu quả marketing, vừa tôn trọng quyền kiểm soát của khách hàng.',
      'Trong các phase tiếp theo, coupon hằng ngày có thể được cá nhân hóa theo lịch sử mua hàng, điểm thành viên, danh mục hay xem, hoặc giá trị giỏ hàng gần nhất. Khi đó, cùng một icon chuông nhưng mỗi khách hàng sẽ nhận một đề xuất khác nhau, gần hơn với nhu cầu thật của họ thay vì một danh sách mã đại trà.',
    ],
  },
  {
    id: 'premium-order-reward',
    title: 'Đơn từ 30 triệu nhận coupon 10% cho lần mua kế',
    summary: 'Các đơn hàng giá trị cao được tự động tặng mã giảm 10% để tiếp tục mua sắm tiết kiệm hơn.',
    tag: 'Thành viên',
    date: '02/06/2026',
    readTime: '8 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200',
    content: [
      'Nhóm khách hàng hoàn tất đơn hàng từ 30 triệu đồng trở lên thường là nhóm có mức độ tin tưởng cao với nền tảng. Vì vậy Lishop bổ sung cơ chế tặng coupon 10% cho lần mua kế tiếp như một phần của chiến lược giữ chân khách hàng sau đơn lớn. Thay vì chỉ kết thúc ở màn thanh toán thành công, hệ thống tiếp tục tạo một lý do rõ ràng để khách quay lại.',
      'Luồng nghiệp vụ được thiết kế để không làm checkout phức tạp hơn. Khi đơn đủ điều kiện và được xác nhận thành công, backend có thể tạo coupon riêng, gắn với đơn hàng hoặc người dùng, sau đó gửi thông báo loại khuyến mãi. Người mua nhận được thông tin trong trang thông báo, đồng thời có thể nhìn thấy mã ở khu vực ưu đãi thành viên.',
      'Mã 10% này nên có giới hạn để bảo vệ biên lợi nhuận. Một cấu hình hợp lý gồm: thời hạn sử dụng, giá trị đơn tối thiểu, mức giảm tối đa, một lượt dùng, và không áp dụng đồng thời với một số chiến dịch flash sale quá sâu. Những ràng buộc này giúp ưu đãi có giá trị thật nhưng không tạo rủi ro tài chính cho cửa hàng.',
      'Về trải nghiệm, thông báo cần viết rõ vì sao khách hàng nhận được mã. Ví dụ: “Cảm ơn bạn đã hoàn tất đơn hàng giá trị cao. Lishop tặng bạn coupon 10% cho lần mua kế tiếp.” Cách diễn đạt này khiến ưu đãi có cảm giác được ghi nhận, không chỉ là một mã giảm giá lạnh lùng.',
      'Cơ chế này cũng tạo dữ liệu tốt cho admin. Lishop có thể đo tỷ lệ khách dùng mã sau đơn lớn, thời gian quay lại mua hàng, danh mục được mua ở lần kế, và doanh thu phát sinh từ nhóm coupon tri ân. Nếu tỷ lệ dùng thấp, có thể điều chỉnh thời hạn, điều kiện hoặc cách hiển thị thông báo.',
      'Khi triển khai thật, nên thêm trạng thái coupon theo vòng đời: đã tạo, đã gửi thông báo, đã xem, đã dùng, đã hết hạn. Các trạng thái này giúp đội vận hành theo dõi chương trình và xử lý các trường hợp khách hàng hỏi về quyền lợi sau khi mua đơn hàng giá trị cao.',
    ],
  },
  {
    id: 'faster-shopping',
    title: 'Trải nghiệm tìm kiếm mới giúp vào catalog nhanh hơn',
    summary: 'Thanh search ở shell chuyển thẳng đến catalog với từ khóa đã nhập, phù hợp kiến trúc micro-frontend.',
    tag: 'Cập nhật',
    date: '02/06/2026',
    readTime: '6 phút đọc',
    imageUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200',
    content: [
      'Trong kiến trúc micro-frontend, shell là cửa vào và lớp điều hướng chung của toàn hệ thống. Vì vậy thanh tìm kiếm ở shell không nên cố xử lý logic catalog ngay tại trang chủ. Thay vào đó, khi người dùng nhập từ khóa và submit, shell chuyển thẳng sang trang sản phẩm của MFE catalog với query `q` đã được encode trong URL.',
      'Cách làm này giúp trách nhiệm của từng phần rõ ràng hơn. Shell giữ nhiệm vụ nhận input, điều hướng và giữ trải nghiệm header nhất quán. Catalog chịu trách nhiệm đọc query, gọi API sản phẩm, áp dụng filter, phân trang và hiển thị kết quả. Khi có thay đổi trong logic tìm kiếm, đội phát triển chỉ cần tập trung vào catalog thay vì sửa nhiều nơi.',
      'Về phía người dùng, lợi ích dễ thấy nhất là URL kết quả có thể chia sẻ và bookmark. Nếu khách tìm “serum” hoặc “áo khoác”, đường dẫn catalog chứa sẵn từ khóa để họ quay lại đúng danh sách. Điều này đặc biệt hữu ích khi người dùng mở nhiều tab, gửi link cho bạn bè, hoặc lưu lại sản phẩm để so sánh.',
      'Thanh search cũng nên hỗ trợ các trường hợp nhập không hợp lệ. Nếu người dùng chỉ nhập khoảng trắng, shell không điều hướng. Nếu từ khóa có ký tự đặc biệt, hệ thống encode URL để tránh lỗi route. Đây là những chi tiết nhỏ nhưng giúp trải nghiệm ổn định hơn trong môi trường production.',
      'Trong các giai đoạn tiếp theo, thanh tìm kiếm có thể được nâng cấp với gợi ý nhanh: sản phẩm phổ biến, thương hiệu, danh mục và lịch sử tìm kiếm gần đây. Tuy nhiên phần gợi ý vẫn nên gọi API nhẹ hoặc cache riêng, còn trang kết quả đầy đủ vẫn thuộc catalog.',
      'Một hướng mở rộng khác là tracking từ khóa tìm kiếm. Khi hiểu người dùng đang tìm gì nhưng chưa mua được, Lishop có thể cải thiện dữ liệu sản phẩm, thêm synonym, đề xuất thương hiệu liên quan hoặc tạo campaign phù hợp với nhu cầu đang nổi lên.',
    ],
  },
];

export function getNewsItem(id: string): NewsItem | undefined {
  return NEWS_ITEMS.find((item) => item.id === id);
}
