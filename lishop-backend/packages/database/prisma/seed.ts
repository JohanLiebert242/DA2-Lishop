import {
  PrismaClient,
  UserRole,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  CouponType,
  ReviewStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.warn('🌱 Seeding database...');

  // ─── CLEANUP (idempotent re-seed) ─────────────────────────────────────────
  await prisma.notification.deleteMany({});
  await prisma.loyaltyPoint.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.flashSaleItem.deleteMany({});
  await prisma.flashSale.deleteMany({});
  console.warn('✅ Cleaned up existing data');

  // ─── USERS ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lishop.vn' },
    update: {},
    create: {
      email: 'admin@lishop.vn',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Lishop',
      role: UserRole.ADMIN,
      emailVerified: true,
      loyaltyPoints: 0,
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'nguyen@lishop.vn' },
    update: {},
    create: {
      email: 'nguyen@lishop.vn',
      passwordHash: customerHash,
      firstName: 'Nguyễn Văn',
      lastName: 'An',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      loyaltyPoints: 1250,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'tran@lishop.vn' },
    update: {},
    create: {
      email: 'tran@lishop.vn',
      passwordHash: customerHash,
      firstName: 'Trần Thị',
      lastName: 'Bình',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      loyaltyPoints: 580,
    },
  });

  const customer3 = await prisma.user.upsert({
    where: { email: 'le@lishop.vn' },
    update: {},
    create: {
      email: 'le@lishop.vn',
      passwordHash: customerHash,
      firstName: 'Lê Minh',
      lastName: 'Châu',
      role: UserRole.CUSTOMER,
      emailVerified: true,
      loyaltyPoints: 200,
    },
  });

  console.warn('✅ Users created');

  // ─── ADDRESSES ────────────────────────────────────────────────────────────
  const addr1 = await prisma.address.create({
    data: {
      userId: customer1.id,
      fullName: 'Nguyễn Văn An',
      phone: '0901234567',
      street: '123 Lê Lợi',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  });

  const addr2 = await prisma.address.create({
    data: {
      userId: customer2.id,
      fullName: 'Trần Thị Bình',
      phone: '0912345678',
      street: '45 Nguyễn Huệ',
      district: 'Quận 3',
      city: 'TP. Hồ Chí Minh',
      isDefault: true,
    },
  });

  const addr3 = await prisma.address.create({
    data: {
      userId: customer3.id,
      fullName: 'Lê Minh Châu',
      phone: '0923456789',
      street: '78 Hoàng Diệu',
      district: 'Quận Hải Châu',
      city: 'Đà Nẵng',
      isDefault: true,
    },
  });

  console.warn('✅ Addresses created');

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  const catElectronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Điện tử',
      slug: 'electronics',
      imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
    },
  });

  const catFashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: {
      name: 'Thời trang',
      slug: 'fashion',
      imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    },
  });

  const catHome = await prisma.category.upsert({
    where: { slug: 'home-living' },
    update: {},
    create: {
      name: 'Nhà cửa & Đời sống',
      slug: 'home-living',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400',
    },
  });

  const catSports = await prisma.category.upsert({
    where: { slug: 'sports' },
    update: {},
    create: {
      name: 'Thể thao',
      slug: 'sports',
      imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
    },
  });

  const catBooks = await prisma.category.upsert({
    where: { slug: 'books' },
    update: {},
    create: {
      name: 'Sách',
      slug: 'books',
      imageUrl: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    },
  });

  // Subcategories
  const catPhones = await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: {
      name: 'Điện thoại',
      slug: 'phones',
      parentId: catElectronics.id,
    },
  });

  const catLaptops = await prisma.category.upsert({
    where: { slug: 'laptops' },
    update: {},
    create: {
      name: 'Laptop',
      slug: 'laptops',
      parentId: catElectronics.id,
    },
  });

  const catMensWear = await prisma.category.upsert({
    where: { slug: 'mens-wear' },
    update: {},
    create: {
      name: 'Nam giới',
      slug: 'mens-wear',
      parentId: catFashion.id,
    },
  });

  const catWomensWear = await prisma.category.upsert({
    where: { slug: 'womens-wear' },
    update: {},
    create: {
      name: 'Nữ giới',
      slug: 'womens-wear',
      parentId: catFashion.id,
    },
  });

  console.warn('✅ Categories created');

  // ─── TAGS ─────────────────────────────────────────────────────────────────
  const tagHot = await prisma.tag.upsert({ where: { name: 'hot' }, update: {}, create: { name: 'hot' } });
  const tagNew = await prisma.tag.upsert({ where: { name: 'new' }, update: {}, create: { name: 'new' } });
  const tagSale = await prisma.tag.upsert({ where: { name: 'sale' }, update: {}, create: { name: 'sale' } });
  const tagBestSeller = await prisma.tag.upsert({ where: { name: 'bestseller' }, update: {}, create: { name: 'bestseller' } });

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────
  const productsData = [
    // Phones
    {
      name: 'iPhone 15 Pro Max 256GB',
      slug: 'iphone-15-pro-max-256gb',
      description: 'iPhone 15 Pro Max với chip A17 Pro, màn hình Super Retina XDR 6.7 inch, camera 48MP chuyên nghiệp. Thiết kế titanium cao cấp, pin cả ngày dài.',
      priceVnd: 34_990_000,
      priceUsd: 1399,
      stock: 25,
      categoryId: catPhones.id,
      averageRating: 4.8,
      reviewCount: 124,
      images: [
        { url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600', alt: 'iPhone 15 Pro Max', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600', alt: 'iPhone 15 Pro Max back', isPrimary: false },
      ],
      variants: [
        {
          sku: 'IPHONE15PM-256-TITAN',
          name: 'Titanium 256GB',
          priceVnd: 34_990_000,
          priceUsd: 1399,
          stock: 15,
          weightGrams: 240,
          attributes: { color: 'Titanium', storage: '256GB' },
          imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
          isDefault: true,
          isActive: true,
        },
        {
          sku: 'IPHONE15PM-512-BLUE',
          name: 'Blue Titanium 512GB',
          priceVnd: 39_990_000,
          priceUsd: 1599,
          stock: 10,
          weightGrams: 240,
          attributes: { color: 'Blue Titanium', storage: '512GB' },
          imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600',
          isDefault: false,
          isActive: true,
        },
      ],
      tags: [tagHot.id, tagBestSeller.id],
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra',
      description: 'Galaxy S24 Ultra với bút S Pen tích hợp, camera 200MP, màn hình Dynamic AMOLED 2X 6.8 inch. Hiệu năng AI mạnh mẽ với chip Snapdragon 8 Gen 3.',
      priceVnd: 31_990_000,
      priceUsd: 1299,
      stock: 18,
      categoryId: catPhones.id,
      averageRating: 4.7,
      reviewCount: 89,
      images: [
        { url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600', alt: 'Samsung Galaxy S24 Ultra', isPrimary: true },
      ],
      tags: [tagHot.id],
    },
    {
      name: 'Xiaomi 14 Ultra',
      slug: 'xiaomi-14-ultra',
      description: 'Xiaomi 14 Ultra với camera Leica chuyên nghiệp, chip Snapdragon 8 Gen 3, màn hình LTPO AMOLED 6.73 inch. Sạc nhanh 90W HyperCharge.',
      priceVnd: 22_990_000,
      priceUsd: 899,
      stock: 30,
      categoryId: catPhones.id,
      averageRating: 4.6,
      reviewCount: 56,
      images: [
        { url: 'https://images.unsplash.com/photo-1598327105854-c8674faddf79?w=600', alt: 'Xiaomi 14 Ultra', isPrimary: true },
      ],
      tags: [tagNew.id],
    },
    // Laptops
    {
      name: 'MacBook Pro 14 M3 Pro',
      slug: 'macbook-pro-14-m3-pro',
      description: 'MacBook Pro 14 inch với chip M3 Pro, màn hình Liquid Retina XDR, pin lên đến 18 giờ. Hiệu năng vượt trội cho công việc sáng tạo chuyên nghiệp.',
      priceVnd: 52_990_000,
      priceUsd: 1999,
      stock: 12,
      categoryId: catLaptops.id,
      averageRating: 4.9,
      reviewCount: 203,
      images: [
        { url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', alt: 'MacBook Pro 14', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=600', alt: 'MacBook Pro 14 side', isPrimary: false },
      ],
      variants: [
        {
          sku: 'MBP14-M3PRO-18-512-SILVER',
          name: 'Silver 18GB / 512GB',
          priceVnd: 52_990_000,
          priceUsd: 1999,
          stock: 7,
          weightGrams: 1600,
          attributes: { color: 'Silver', memory: '18GB', storage: '512GB' },
          imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
          isDefault: true,
          isActive: true,
        },
        {
          sku: 'MBP14-M3PRO-36-1TB-BLACK',
          name: 'Space Black 36GB / 1TB',
          priceVnd: 66_990_000,
          priceUsd: 2599,
          stock: 5,
          weightGrams: 1600,
          attributes: { color: 'Space Black', memory: '36GB', storage: '1TB' },
          imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600',
          isDefault: false,
          isActive: true,
        },
      ],
      tags: [tagBestSeller.id, tagHot.id],
    },
    {
      name: 'Dell XPS 15 9530',
      slug: 'dell-xps-15-9530',
      description: 'Dell XPS 15 với màn hình OLED 3.5K, Intel Core i9-13900H, RAM 32GB DDR5, SSD 1TB. Thiết kế mỏng nhẹ cao cấp cho dân văn phòng.',
      priceVnd: 42_990_000,
      priceUsd: 1799,
      stock: 8,
      categoryId: catLaptops.id,
      averageRating: 4.5,
      reviewCount: 67,
      images: [
        { url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600', alt: 'Dell XPS 15', isPrimary: true },
      ],
      tags: [tagNew.id],
    },
    {
      name: 'ASUS ROG Zephyrus G14',
      slug: 'asus-rog-zephyrus-g14',
      description: 'Laptop gaming ASUS ROG với AMD Ryzen 9, RTX 4060, màn hình 165Hz. Thiết kế compact 14 inch mang đến hiệu năng gaming đỉnh cao mọi nơi.',
      priceVnd: 28_990_000,
      priceUsd: 1199,
      stock: 15,
      categoryId: catLaptops.id,
      averageRating: 4.6,
      reviewCount: 45,
      images: [
        { url: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600', alt: 'ASUS ROG', isPrimary: true },
      ],
      tags: [tagHot.id, tagSale.id],
    },
    // Fashion - Men
    {
      name: 'Áo Polo Nam Cao Cấp Lacoste',
      slug: 'ao-polo-nam-lacoste',
      description: 'Áo polo nam Lacoste chất liệu cotton piqué cao cấp, thoáng mát và bền đẹp. Logo cá sấu thêu tinh xảo, nhiều màu sắc lựa chọn.',
      priceVnd: 1_890_000,
      priceUsd: 75,
      stock: 100,
      categoryId: catMensWear.id,
      averageRating: 4.4,
      reviewCount: 312,
      images: [
        { url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600', alt: 'Áo Polo Lacoste', isPrimary: true },
      ],
      variants: [
        {
          sku: 'LACOSTE-POLO-NAVY-M',
          name: 'Navy / M',
          priceVnd: 1_890_000,
          priceUsd: 75,
          stock: 30,
          weightGrams: 300,
          attributes: { color: 'Navy', size: 'M' },
          imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
          isDefault: true,
          isActive: true,
        },
        {
          sku: 'LACOSTE-POLO-WHITE-L',
          name: 'White / L',
          priceVnd: 1_990_000,
          priceUsd: 79,
          stock: 25,
          weightGrams: 300,
          attributes: { color: 'White', size: 'L' },
          imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600',
          isDefault: false,
          isActive: true,
        },
      ],
      tags: [tagBestSeller.id],
    },
    {
      name: 'Quần Jeans Nam Slim Fit Levi\'s 511',
      slug: 'quan-jeans-nam-levis-511',
      description: 'Quần jeans nam Levi\'s 511 dáng slim fit, chất liệu denim cao cấp co giãn nhẹ. Phong cách thời trang, phù hợp nhiều dịp khác nhau.',
      priceVnd: 1_490_000,
      priceUsd: 59,
      stock: 75,
      categoryId: catMensWear.id,
      averageRating: 4.5,
      reviewCount: 189,
      images: [
        { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600', alt: 'Quần Jeans Levi\'s', isPrimary: true },
      ],
      tags: [tagBestSeller.id, tagSale.id],
    },
    // Fashion - Women
    {
      name: 'Váy Đầm Nữ Zara Floral',
      slug: 'vay-dam-nu-zara-floral',
      description: 'Váy đầm nữ Zara họa tiết hoa, chất liệu voan mềm nhẹ. Thiết kế thanh lịch, phù hợp đi làm hoặc dự tiệc. Dáng midi tôn dáng.',
      priceVnd: 890_000,
      priceUsd: 35,
      stock: 60,
      categoryId: catWomensWear.id,
      averageRating: 4.3,
      reviewCount: 234,
      images: [
        { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600', alt: 'Váy đầm Zara', isPrimary: true },
      ],
      tags: [tagNew.id, tagSale.id],
    },
    {
      name: 'Túi Xách Nữ Michael Kors',
      slug: 'tui-xach-nu-michael-kors',
      description: 'Túi xách nữ Michael Kors da thật cao cấp, khóa logo sang trọng. Nhiều ngăn tiện lợi, dây đeo có thể tháo rời. Phong cách luxury.',
      priceVnd: 5_490_000,
      priceUsd: 219,
      stock: 20,
      categoryId: catWomensWear.id,
      averageRating: 4.7,
      reviewCount: 98,
      images: [
        { url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600', alt: 'Túi Michael Kors', isPrimary: true },
      ],
      tags: [tagHot.id],
    },
    // Home & Living
    {
      name: 'Sofa Da 3 Chỗ Cao Cấp',
      slug: 'sofa-da-3-cho-cao-cap',
      description: 'Sofa da 3 chỗ ngồi thiết kế hiện đại, khung gỗ tự nhiên chắc chắn. Đệm mút cao cấp êm ái, dễ vệ sinh. Phù hợp phòng khách rộng.',
      priceVnd: 12_500_000,
      priceUsd: 499,
      stock: 5,
      categoryId: catHome.id,
      averageRating: 4.6,
      reviewCount: 43,
      images: [
        { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600', alt: 'Sofa da', isPrimary: true },
      ],
      tags: [tagNew.id],
    },
    {
      name: 'Nồi Chiên Không Dầu Philips HD9270',
      slug: 'noi-chien-khong-dau-philips',
      description: 'Nồi chiên không dầu Philips 7L, công suất 2000W. Công nghệ RapidAir giúp thức ăn giòn đều, ít dầu mỡ. Màn hình cảm ứng tiện lợi.',
      priceVnd: 3_290_000,
      priceUsd: 129,
      stock: 45,
      categoryId: catHome.id,
      averageRating: 4.8,
      reviewCount: 567,
      images: [
        { url: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600', alt: 'Nồi chiên không dầu Philips', isPrimary: true },
      ],
      tags: [tagBestSeller.id, tagHot.id],
    },
    // Sports
    {
      name: 'Giày Chạy Bộ Nike Air Zoom Pegasus 40',
      slug: 'giay-chay-bo-nike-pegasus-40',
      description: 'Giày chạy bộ Nike Pegasus 40 với đệm Air Zoom phản hồi cao, đế ngoài cao su bền bỉ. Phù hợp chạy hàng ngày với khoảng cách trung bình đến dài.',
      priceVnd: 3_390_000,
      priceUsd: 130,
      stock: 50,
      categoryId: catSports.id,
      averageRating: 4.7,
      reviewCount: 423,
      images: [
        { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', alt: 'Nike Pegasus 40', isPrimary: true },
        { url: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600', alt: 'Nike Pegasus 40 side', isPrimary: false },
      ],
      variants: [
        {
          sku: 'NIKE-PEGASUS40-BLACK-42',
          name: 'Black / EU 42',
          priceVnd: 3_390_000,
          priceUsd: 130,
          stock: 18,
          weightGrams: 700,
          attributes: { color: 'Black', size: 'EU 42' },
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
          isDefault: true,
          isActive: true,
        },
        {
          sku: 'NIKE-PEGASUS40-RED-43',
          name: 'Red / EU 43',
          priceVnd: 3_490_000,
          priceUsd: 135,
          stock: 15,
          weightGrams: 700,
          attributes: { color: 'Red', size: 'EU 43' },
          imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
          isDefault: false,
          isActive: true,
        },
      ],
      tags: [tagBestSeller.id, tagHot.id],
    },
    {
      name: 'Bộ Tạ Tay 10kg Bowflex',
      slug: 'bo-ta-tay-10kg-bowflex',
      description: 'Bộ tạ tay điều chỉnh Bowflex SelectTech từ 2-10kg. Thay đổi trọng lượng nhanh chóng bằng núm xoay. Tiết kiệm không gian, phù hợp tập gym tại nhà.',
      priceVnd: 2_890_000,
      priceUsd: 115,
      stock: 30,
      categoryId: catSports.id,
      averageRating: 4.5,
      reviewCount: 156,
      images: [
        { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', alt: 'Tạ tay', isPrimary: true },
      ],
      tags: [tagSale.id],
    },
    // Books
    {
      name: 'Đắc Nhân Tâm - Dale Carnegie',
      slug: 'dac-nhan-tam-dale-carnegie',
      description: 'Cuốn sách kinh điển về nghệ thuật đối nhân xử thế của Dale Carnegie. Hơn 30 triệu bản được bán ra trên toàn thế giới. Bản dịch tiếng Việt chất lượng cao.',
      priceVnd: 89_000,
      priceUsd: 4,
      stock: 200,
      categoryId: catBooks.id,
      averageRating: 4.9,
      reviewCount: 1240,
      images: [
        { url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600', alt: 'Đắc Nhân Tâm', isPrimary: true },
      ],
      tags: [tagBestSeller.id, tagHot.id],
    },
  ];

  const createdProducts: Record<string, string> = {};

  for (const p of productsData) {
    const { images, tags, variants, ...productData } = p;
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...productData,
        images: { create: images },
        ...(variants?.length ? { variants: { create: variants } } : {}),
      },
    });
    createdProducts[p.slug] = product.id;

    // Attach tags
    for (const tagId of tags) {
      await prisma.productTag.upsert({
        where: { productId_tagId: { productId: product.id, tagId } },
        update: {},
        create: { productId: product.id, tagId },
      });
    }
  }

  console.warn('✅ Products created');

  // ─── COUPONS ──────────────────────────────────────────────────────────────
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: CouponType.PERCENT,
      value: 10,
      minOrderVnd: 500_000,
      maxUses: 1000,
      usedCount: 342,
      isActive: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'SALE50K' },
    update: {},
    create: {
      code: 'SALE50K',
      type: CouponType.FIXED,
      value: 50_000,
      minOrderVnd: 300_000,
      maxUses: 500,
      usedCount: 189,
      isActive: true,
      expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'FREESHIP' },
    update: {},
    create: {
      code: 'FREESHIP',
      type: CouponType.FREE_SHIPPING,
      value: 0,
      minOrderVnd: 200_000,
      maxUses: null,
      usedCount: 712,
      isActive: true,
    },
  });

  await prisma.coupon.upsert({
    where: { code: 'VIP20' },
    update: {},
    create: {
      code: 'VIP20',
      type: CouponType.PERCENT,
      value: 20,
      minOrderVnd: 2_000_000,
      maxUses: 100,
      usedCount: 28,
      isActive: true,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  console.warn('✅ Coupons created');

  // ─── FLASH SALE ───────────────────────────────────────────────────────────
  const flashSale = await prisma.flashSale.create({
    data: {
      startAt: new Date(Date.now() - 60 * 60 * 1000),          // started 1h ago
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),   // ends in 7 days
      isActive: true,
    },
  });

  const flashItems = [
    { slug: 'asus-rog-zephyrus-g14', discountPercent: 15 },
    { slug: 'quan-jeans-nam-levis-511', discountPercent: 20 },
    { slug: 'vay-dam-nu-zara-floral', discountPercent: 25 },
    { slug: 'bo-ta-tay-10kg-bowflex', discountPercent: 10 },
    { slug: 'noi-chien-khong-dau-philips', discountPercent: 12 },
  ];

  for (const item of flashItems) {
    const productId = createdProducts[item.slug] ?? createdProducts['asus-rog-zephyrus-g14'];
    if (!productId) continue;
    await prisma.flashSaleItem.upsert({
      where: { flashSaleId_productId: { flashSaleId: flashSale.id, productId } },
      update: {},
      create: {
        flashSaleId: flashSale.id,
        productId,
        discountPercent: item.discountPercent,
      },
    });
  }

  console.warn('✅ Flash sale created');

  // ─── ORDERS ───────────────────────────────────────────────────────────────
  const ordersData = [
    {
      user: customer1,
      address: addr1,
      orderNumber: 'LS-0001',
      status: OrderStatus.DELIVERED,
      items: [
        { slug: 'iphone-15-pro-max-256gb', qty: 1, price: 34_990_000 },
        { slug: 'ao-polo-nam-lacoste', qty: 2, price: 1_890_000 },
      ],
      shipping: 0,
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.COMPLETED,
      daysAgo: 20,
    },
    {
      user: customer1,
      address: addr1,
      orderNumber: 'LS-0002',
      status: OrderStatus.SHIPPED,
      items: [
        { slug: 'macbook-pro-14-m3-pro', qty: 1, price: 52_990_000 },
      ],
      shipping: 50_000,
      paymentMethod: PaymentMethod.VNPAY,
      paymentStatus: PaymentStatus.COMPLETED,
      daysAgo: 5,
    },
    {
      user: customer1,
      address: addr1,
      orderNumber: 'LS-0003',
      status: OrderStatus.PROCESSING,
      items: [
        { slug: 'giay-chay-bo-nike-pegasus-40', qty: 1, price: 3_390_000 },
        { slug: 'bo-ta-tay-10kg-bowflex', qty: 1, price: 2_890_000 },
      ],
      shipping: 30_000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      daysAgo: 2,
    },
    {
      user: customer2,
      address: addr2,
      orderNumber: 'LS-0004',
      status: OrderStatus.DELIVERED,
      items: [
        { slug: 'tui-xach-nu-michael-kors', qty: 1, price: 5_490_000 },
        { slug: 'vay-dam-nu-zara-floral', qty: 2, price: 890_000 },
      ],
      shipping: 0,
      paymentMethod: PaymentMethod.STRIPE,
      paymentStatus: PaymentStatus.COMPLETED,
      daysAgo: 15,
    },
    {
      user: customer2,
      address: addr2,
      orderNumber: 'LS-0005',
      status: OrderStatus.PENDING,
      items: [
        { slug: 'noi-chien-khong-dau-philips', qty: 1, price: 3_290_000 },
      ],
      shipping: 50_000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      daysAgo: 0,
    },
    {
      user: customer3,
      address: addr3,
      orderNumber: 'LS-0006',
      status: OrderStatus.CANCELLED,
      items: [
        { slug: 'samsung-galaxy-s24-ultra', qty: 1, price: 31_990_000 },
      ],
      shipping: 0,
      paymentMethod: PaymentMethod.VNPAY,
      paymentStatus: PaymentStatus.REFUNDED,
      daysAgo: 10,
    },
    {
      user: customer3,
      address: addr3,
      orderNumber: 'LS-0007',
      status: OrderStatus.DELIVERED,
      items: [
        { slug: 'dac-nhan-tam-dale-carnegie', qty: 3, price: 89_000 },
        { slug: 'ao-polo-nam-lacoste', qty: 1, price: 1_890_000 },
      ],
      shipping: 30_000,
      paymentMethod: PaymentMethod.MOMO,
      paymentStatus: PaymentStatus.COMPLETED,
      daysAgo: 30,
    },
    {
      user: customer1,
      address: addr1,
      orderNumber: 'LS-0008',
      status: OrderStatus.PENDING,
      items: [
        { slug: 'xiaomi-14-ultra', qty: 1, price: 22_990_000 },
      ],
      shipping: 50_000,
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.PENDING,
      daysAgo: 0,
    },
  ];

  for (const od of ordersData) {
    const subtotal = od.items.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal + od.shipping;
    const createdAt = new Date(Date.now() - od.daysAgo * 24 * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber: od.orderNumber,
        userId: od.user.id,
        addressId: od.address.id,
        status: od.status,
        subtotalVnd: subtotal,
        shippingFeeVnd: od.shipping,
        discountVnd: 0,
        totalVnd: total,
        createdAt,
        updatedAt: createdAt,
        items: {
          create: od.items.map((item) => ({
            productId: createdProducts[item.slug] ?? createdProducts['iphone-15-pro-max-256gb'],
            productName: item.slug.replace(/-/g, ' '),
            quantity: item.qty,
            unitPriceVnd: item.price,
            totalPriceVnd: item.price * item.qty,
          })),
        },
        payment: {
          create: {
            method: od.paymentMethod,
            amountVnd: total,
            status: od.paymentStatus,
            createdAt,
            updatedAt: createdAt,
          },
        },
      },
    });

    // Add shipment for shipped/delivered orders
    if (od.status === OrderStatus.SHIPPED || od.status === OrderStatus.DELIVERED) {
      await prisma.shipment.create({
        data: {
          orderId: order.id,
          provider: 'Giao Hàng Nhanh',
          trackingNumber: `GHN${Math.floor(Math.random() * 1_000_000_000)}`,
          estimatedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
          shippedAt: new Date(createdAt.getTime() + 1 * 24 * 60 * 60 * 1000),
          deliveredAt: od.status === OrderStatus.DELIVERED
            ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
            : null,
        },
      });
    }
  }

  console.warn('✅ Orders created');

  // ─── REVIEWS ──────────────────────────────────────────────────────────────
  const reviewsData = [
    { userId: customer1.id, slug: 'iphone-15-pro-max-256gb', rating: 5, content: 'Sản phẩm tuyệt vời! Camera chụp đẹp hơn mong đợi, pin trâu, máy mượt. Đóng gói cẩn thận, giao hàng nhanh. Rất hài lòng!' },
    { userId: customer2.id, slug: 'iphone-15-pro-max-256gb', rating: 4, content: 'Máy đẹp, hiệu năng tốt. Chỉ tiếc giá hơi cao nhưng xứng đáng với chất lượng. Màn hình ProMotion 120Hz rất mượt.' },
    { userId: customer1.id, slug: 'macbook-pro-14-m3-pro', rating: 5, content: 'Đây là laptop tốt nhất tôi từng dùng. Chip M3 Pro cực kỳ mạnh, fanless khi làm việc bình thường. Pin cả ngày không cần sạc.' },
    { userId: customer3.id, slug: 'macbook-pro-14-m3-pro', rating: 5, content: 'Xuất sắc! Dùng cho công việc đồ họa và lập trình. Màn hình Liquid Retina XDR sắc nét tuyệt đẹp.' },
    { userId: customer2.id, slug: 'noi-chien-khong-dau-philips', rating: 5, content: 'Nồi chiên không dầu tốt nhất! Thức ăn chiên giòn đều, không bị khô. Dung tích 7L đủ cho cả gia đình. Rất đáng mua!' },
    { userId: customer1.id, slug: 'dac-nhan-tam-dale-carnegie', rating: 5, content: 'Sách hay nhất về kỹ năng giao tiếp. Đọc xong thay đổi cách nhìn nhận về các mối quan hệ. Nên đọc ít nhất 1 lần trong đời!' },
    { userId: customer3.id, slug: 'giay-chay-bo-nike-pegasus-40', rating: 4, content: 'Giày êm, thoáng khí tốt. Đế êm ái khi chạy dài. Form hơi rộng nên nên chọn size nhỏ hơn bình thường một nửa.' },
    { userId: customer2.id, slug: 'tui-xach-nu-michael-kors', rating: 5, content: 'Túi đẹp, da thật mềm mại. Màu sắc đúng như hình. Phong cách sang trọng, nhận được nhiều lời khen khi mang đi.' },
  ];

  for (const r of reviewsData) {
    const productId = createdProducts[r.slug];
    if (!productId) continue;
    await prisma.review.upsert({
      where: { productId_userId: { productId, userId: r.userId } },
      update: {},
      create: {
        productId,
        userId: r.userId,
        rating: r.rating,
        content: r.content,
        status: ReviewStatus.APPROVED,
        verifiedPurchase: true,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.warn('✅ Reviews created');

  // ─── LOYALTY POINTS ───────────────────────────────────────────────────────
  const loyaltyData = [
    { userId: customer1.id, points: 500, description: 'Hoàn tiền đơn hàng LS-0001' },
    { userId: customer1.id, points: 700, description: 'Hoàn tiền đơn hàng LS-0002' },
    { userId: customer1.id, points: 50, description: 'Đăng ký thành viên' },
    { userId: customer2.id, points: 300, description: 'Hoàn tiền đơn hàng LS-0004' },
    { userId: customer2.id, points: 280, description: 'Bonus mua hàng tháng 4' },
    { userId: customer3.id, points: 200, description: 'Hoàn tiền đơn hàng LS-0007' },
  ];

  for (const lp of loyaltyData) {
    await prisma.loyaltyPoint.create({
      data: {
        ...lp,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.warn('✅ Loyalty points created');

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  const notifData = [
    { userId: customer1.id, title: 'Đơn hàng đã giao thành công', body: 'Đơn hàng LS-0001 đã được giao. Cảm ơn bạn đã mua sắm tại Lishop!', type: 'ORDER_DELIVERED', isRead: true },
    { userId: customer1.id, title: 'Đơn hàng đang vận chuyển', body: 'Đơn hàng LS-0002 đang trên đường giao đến bạn. Dự kiến nhận hàng trong 1-2 ngày.', type: 'ORDER_SHIPPED', isRead: false },
    { userId: customer1.id, title: 'Flash Sale hôm nay!', body: 'Đừng bỏ lỡ Flash Sale với ưu đãi lên đến 25% cho nhiều sản phẩm. Chỉ còn 22 giờ!', type: 'PROMOTION', isRead: false },
    { userId: customer1.id, title: 'Điểm thưởng được cộng', body: 'Bạn đã nhận 700 điểm thưởng từ đơn hàng LS-0002. Tổng điểm: 1250 điểm.', type: 'LOYALTY', isRead: true },
    { userId: customer2.id, title: 'Đơn hàng đã giao thành công', body: 'Đơn hàng LS-0004 đã được giao. Hãy để lại đánh giá để giúp người mua khác!', type: 'ORDER_DELIVERED', isRead: false },
    { userId: customer2.id, title: 'Mã giảm giá mới cho bạn', body: 'Dùng mã WELCOME10 để được giảm 10% cho đơn hàng từ 500.000đ. Hết hạn sau 30 ngày.', type: 'COUPON', isRead: false },
    { userId: customer3.id, title: 'Đơn hàng đã bị hủy', body: 'Đơn hàng LS-0006 đã được hủy theo yêu cầu của bạn. Hoàn tiền trong 3-5 ngày làm việc.', type: 'ORDER_CANCELLED', isRead: true },
  ];

  for (const n of notifData) {
    await prisma.notification.create({
      data: {
        ...n,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.warn('✅ Notifications created');

  console.warn('\n🎉 Seed complete!');
  console.warn('\nAccounts:');
  console.warn('  Admin:     admin@lishop.vn     / Admin@12345');
  console.warn('  Customer1: nguyen@lishop.vn    / Customer@123');
  console.warn('  Customer2: tran@lishop.vn      / Customer@123');
  console.warn('  Customer3: le@lishop.vn        / Customer@123');
}

main().finally(() => prisma.$disconnect());
