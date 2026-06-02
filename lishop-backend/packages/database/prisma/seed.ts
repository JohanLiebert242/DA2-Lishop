import {
  CouponType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  RefundMethod,
  RefundStatus,
  ReturnReason,
  ReturnStatus,
  ReviewStatus,
  ShippingProvider,
  StockMovementType,
  TicketCategory,
  TicketStatus,
  UserRole,
  WalletTxType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const now = new Date();

type CreatedUser = Awaited<ReturnType<typeof prisma.user.create>>;
type CreatedProduct = Awaited<ReturnType<typeof prisma.product.create>>;
type CreatedVariant = Awaited<ReturnType<typeof prisma.productVariant.create>>;
type CreatedOrder = Awaited<ReturnType<typeof prisma.order.create>>;
type CreatedOrderItem = Awaited<ReturnType<typeof prisma.orderItem.create>>;

type ProductSeed = {
  name: string;
  categorySlug: string;
  priceVnd: number;
  stock: number;
  imageKey: keyof typeof IMAGE_POOLS;
  tags: string[];
  variantKind?: 'tech' | 'size' | 'shoe' | 'book';
};

const IMAGE_POOLS = {
  phones: [
    'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900',
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900',
  ],
  laptops: [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900',
  ],
  audio: [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900',
    'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900',
  ],
  fashion: [
    'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900',
  ],
  shoes: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900',
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=900',
  ],
  home: [
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900',
    'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?w=900',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=900',
  ],
  fitness: [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900',
  ],
  books: [
    'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=900',
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=900',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900',
  ],
} as const;

const categorySeeds = [
  { name: 'Electronics', slug: 'electronics', imageUrl: IMAGE_POOLS.phones[0] },
  { name: 'Fashion', slug: 'fashion', imageUrl: IMAGE_POOLS.fashion[0] },
  { name: 'Home Living', slug: 'home-living', imageUrl: IMAGE_POOLS.home[0] },
  { name: 'Sports', slug: 'sports', imageUrl: IMAGE_POOLS.fitness[0] },
  { name: 'Books', slug: 'books', imageUrl: IMAGE_POOLS.books[0] },
  { name: 'Beauty', slug: 'beauty', imageUrl: IMAGE_POOLS.beauty[0] },
] as const;

const childCategorySeeds = [
  { name: 'Phones', slug: 'phones', parentSlug: 'electronics' },
  { name: 'Laptops', slug: 'laptops', parentSlug: 'electronics' },
  { name: 'Audio', slug: 'audio', parentSlug: 'electronics' },
  { name: 'Mens Wear', slug: 'mens-wear', parentSlug: 'fashion' },
  { name: 'Womens Wear', slug: 'womens-wear', parentSlug: 'fashion' },
  { name: 'Shoes', slug: 'shoes', parentSlug: 'fashion' },
  { name: 'Kitchen', slug: 'kitchen', parentSlug: 'home-living' },
  { name: 'Furniture', slug: 'furniture', parentSlug: 'home-living' },
  { name: 'Decor', slug: 'decor', parentSlug: 'home-living' },
  { name: 'Fitness', slug: 'fitness', parentSlug: 'sports' },
  { name: 'Business Books', slug: 'business-books', parentSlug: 'books' },
  { name: 'Skincare', slug: 'skincare', parentSlug: 'beauty' },
] as const;

const productSeeds: ProductSeed[] = [
  ...makeProducts('phones', 'phones', 'tech', [
    ['iPhone 15 Pro Max 256GB', 34990000],
    ['Samsung Galaxy S24 Ultra', 31990000],
    ['Xiaomi 14 Ultra', 22990000],
    ['OPPO Find X7 Ultra', 19990000],
    ['Google Pixel 8 Pro', 23990000],
    ['ASUS ROG Phone 8', 24990000],
  ], 18),
  ...makeProducts('laptops', 'laptops', 'tech', [
    ['MacBook Pro 14 M3 Pro', 52990000],
    ['Dell XPS 15 9530', 42990000],
    ['ASUS ROG Zephyrus G14', 28990000],
    ['Lenovo ThinkPad X1 Carbon', 38990000],
    ['HP Spectre x360 14', 32990000],
    ['Acer Swift Go OLED', 20990000],
  ], 8),
  ...makeProducts('audio', 'audio', 'tech', [
    ['Sony WH-1000XM5 Headphones', 8490000],
    ['Apple AirPods Pro 2', 6490000],
    ['JBL Charge 5 Speaker', 3990000],
    ['Marshall Stanmore III', 10990000],
  ], 25),
  ...makeProducts('mens-wear', 'fashion', 'size', [
    ['Lacoste Premium Polo Shirt', 1890000],
    ['Levis 511 Slim Jeans', 1490000],
    ['Oxford Cotton Shirt', 790000],
    ['Bomber Jacket Navy', 1290000],
    ['Chino Pants Khaki', 890000],
  ], 60),
  ...makeProducts('womens-wear', 'fashion', 'size', [
    ['Zara Floral Midi Dress', 890000],
    ['Silk Office Blouse', 690000],
    ['High Waist Wide Pants', 790000],
    ['Linen Summer Dress', 990000],
    ['Michael Kors Tote Bag', 5490000],
  ], 45),
  ...makeProducts('shoes', 'shoes', 'shoe', [
    ['Nike Pegasus 40 Running Shoes', 3390000],
    ['Adidas Ultraboost Light', 4190000],
    ['Converse Chuck 70 High', 1890000],
    ['New Balance 550 White Green', 2990000],
  ], 35),
  ...makeProducts('kitchen', 'kitchen', undefined, [
    ['Philips HD9270 Air Fryer', 3290000],
    ['LocknLock Cookware Set', 1890000],
    ['Dyson V12 Detect Vacuum', 16990000],
    ['Bear Multi Cooker 3L', 1290000],
  ], 18),
  ...makeProducts('furniture', 'home', undefined, [
    ['Premium Leather Sofa 3 Seats', 12500000],
    ['Oak Dining Table Set', 8990000],
    ['Ergonomic Work Chair', 3490000],
  ], 6),
  ...makeProducts('decor', 'home', undefined, [
    ['Minimal Ceramic Vase Set', 450000],
    ['Warm LED Floor Lamp', 1250000],
    ['Cotton Bedding Queen Set', 1590000],
  ], 20),
  ...makeProducts('fitness', 'fitness', undefined, [
    ['Bowflex Adjustable Dumbbells 10kg', 2890000],
    ['Yoga Mat Pro 6mm', 650000],
    ['Garmin Forerunner 265', 10990000],
    ['Resistance Band Training Kit', 390000],
  ], 40),
  ...makeProducts('business-books', 'books', 'book', [
    ['How to Win Friends and Influence People', 89000],
    ['Atomic Habits', 159000],
    ['The Lean Startup', 179000],
  ], 120),
  ...makeProducts('skincare', 'beauty', undefined, [
    ['La Roche Posay Sunscreen SPF50', 490000],
    ['Kiehl Calendula Toner', 950000],
    ['The Ordinary Niacinamide Serum', 320000],
  ], 70),
];

function makeProducts(
  categorySlug: string,
  imageKey: keyof typeof IMAGE_POOLS,
  variantKind: ProductSeed['variantKind'],
  items: Array<[string, number]>,
  baseStock: number,
): ProductSeed[] {
  return items.map(([name, priceVnd], index) => ({
    name,
    categorySlug,
    priceVnd,
    stock: baseStock + index * 3,
    imageKey,
    variantKind,
    tags: index % 3 === 0 ? ['hot', 'bestseller'] : index % 3 === 1 ? ['new'] : ['sale'],
  }));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function daysAgo(days: number) {
  return new Date(now.getTime() - days * DAY);
}

function daysFromNow(days: number) {
  return new Date(now.getTime() + days * DAY);
}

function priceUsd(priceVnd: number) {
  return Math.max(1, Math.round(priceVnd / 25000));
}

function uniqueProductImageUrl(slug: string, imageIndex: number) {
  const role = imageIndex === 0 ? 'primary' : `gallery-${imageIndex}`;
  return `https://picsum.photos/seed/lishop-${slug}-${role}/900/900`;
}

function uniqueVariantImageUrl(productSlug: string, variantSlug: string) {
  return `https://picsum.photos/seed/lishop-${productSlug}-variant-${variantSlug}/900/900`;
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

async function cleanup() {
  await prisma.refund.deleteMany({});
  await prisma.returnItem.deleteMany({});
  await prisma.returnRequest.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.walletTransaction.deleteMany({});
  await prisma.wallet.deleteMany({});
  await prisma.ticketMessage.deleteMany({});
  await prisma.supportTicket.deleteMany({});
  await prisma.fAQ.deleteMany({});
  await prisma.wishlist.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.notificationPreference.deleteMany({});
  await prisma.deviceToken.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.loyaltyPoint.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.shipmentEvent.deleteMany({});
  await prisma.shipment.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.couponUsage.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.flashSaleItem.deleteMany({});
  await prisma.flashSale.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.productTag.deleteMany({});
  await prisma.tag.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.user.deleteMany({});
}

async function createUsers() {
  const adminHash = await bcrypt.hash('Admin@12345', 10);
  const customerHash = await bcrypt.hash('Customer@123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@lishop.vn',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'Lishop',
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });

  const names = [
    ['Nguyen Van', 'An'],
    ['Tran Thi', 'Binh'],
    ['Le Minh', 'Chau'],
    ['Pham Quoc', 'Dung'],
    ['Hoang Gia', 'Han'],
    ['Do Anh', 'Khoa'],
    ['Vo Thanh', 'Linh'],
    ['Bui Ngoc', 'Mai'],
    ['Dang Tuan', 'Nam'],
    ['Phan My', 'Quyen'],
  ];

  const customers: CreatedUser[] = [];
  for (const [index, [firstName, lastName]] of names.entries()) {
    customers.push(await prisma.user.create({
      data: {
        email: `customer${index + 1}@lishop.vn`,
        passwordHash: customerHash,
        firstName,
        lastName,
        avatarUrl: `https://i.pravatar.cc/160?img=${index + 10}`,
        role: UserRole.CUSTOMER,
        emailVerified: true,
        loyaltyPoints: 150 + index * 120,
      },
    }));
  }

  return { admin, customers };
}

async function createAddresses(customers: CreatedUser[]) {
  const streets = [
    ['12 Le Loi', 'District 1', 'Ho Chi Minh City'],
    ['45 Nguyen Hue', 'District 3', 'Ho Chi Minh City'],
    ['78 Hoang Dieu', 'Hai Chau', 'Da Nang'],
    ['101 Tran Phu', 'Ba Dinh', 'Ha Noi'],
    ['22 Bach Dang', 'Ninh Kieu', 'Can Tho'],
  ];

  const addresses = [];
  for (const [index, user] of customers.entries()) {
    const base = pick(streets, index);
    addresses.push(await prisma.address.create({
      data: {
        userId: user.id,
        fullName: `${user.firstName} ${user.lastName}`,
        phone: `09${String(index + 10000000).slice(0, 8)}`,
        street: base[0],
        district: base[1],
        city: base[2],
        isDefault: true,
      },
    }));

    if (index < 5) {
      const secondary = pick(streets, index + 2);
      await prisma.address.create({
        data: {
          userId: user.id,
          fullName: `${user.firstName} ${user.lastName}`,
          phone: `08${String(index + 20000000).slice(0, 8)}`,
          street: secondary[0],
          district: secondary[1],
          city: secondary[2],
          isDefault: false,
        },
      });
    }
  }

  return addresses;
}

async function createCategories() {
  const categories = new Map<string, string>();

  for (const seed of categorySeeds) {
    const category = await prisma.category.create({ data: seed });
    categories.set(seed.slug, category.id);
  }

  for (const seed of childCategorySeeds) {
    const parentId = categories.get(seed.parentSlug);
    if (!parentId) throw new Error(`Missing parent category ${seed.parentSlug}`);

    const category = await prisma.category.create({
      data: {
        name: seed.name,
        slug: seed.slug,
        parentId,
      },
    });
    categories.set(seed.slug, category.id);
  }

  return categories;
}

async function createTags() {
  const tagNames = ['hot', 'new', 'sale', 'bestseller', 'premium', 'eco', 'gift', 'limited', 'office', 'family'];
  const tags = new Map<string, string>();

  for (const name of tagNames) {
    const tag = await prisma.tag.create({ data: { name } });
    tags.set(name, tag.id);
  }

  return tags;
}

function buildVariants(seed: ProductSeed) {
  const productSlug = slugify(seed.name);
  const slug = slugify(seed.name).toUpperCase();

  if (seed.variantKind === 'tech') {
    return [
      {
        sku: `${slug}-STD`,
        name: 'Standard',
        priceVnd: seed.priceVnd,
        priceUsd: priceUsd(seed.priceVnd),
        stock: Math.max(1, Math.floor(seed.stock * 0.6)),
        weightGrams: seed.categorySlug === 'laptops' ? 1600 : 450,
        attributes: { color: 'Graphite', storage: seed.categorySlug === 'phones' ? '256GB' : '512GB' },
        imageUrl: uniqueVariantImageUrl(productSlug, 'standard'),
        isDefault: true,
        isActive: true,
      },
      {
        sku: `${slug}-PLUS`,
        name: 'Plus',
        priceVnd: seed.priceVnd + Math.round(seed.priceVnd * 0.15),
        priceUsd: priceUsd(seed.priceVnd + Math.round(seed.priceVnd * 0.15)),
        stock: Math.max(1, Math.floor(seed.stock * 0.4)),
        weightGrams: seed.categorySlug === 'laptops' ? 1700 : 470,
        attributes: { color: 'Silver', storage: seed.categorySlug === 'phones' ? '512GB' : '1TB' },
        imageUrl: uniqueVariantImageUrl(productSlug, 'plus'),
        isDefault: false,
        isActive: true,
      },
    ];
  }

  if (seed.variantKind === 'size') {
    return ['S', 'M', 'L'].map((size, sizeIndex) => ({
      sku: `${slug}-${size}`,
      name: `${pick(['Black', 'White', 'Navy'], sizeIndex)} / ${size}`,
      priceVnd: seed.priceVnd + sizeIndex * 50000,
      priceUsd: priceUsd(seed.priceVnd + sizeIndex * 50000),
      stock: Math.max(1, Math.floor(seed.stock / 3)),
      weightGrams: 350,
      attributes: { color: pick(['Black', 'White', 'Navy'], sizeIndex), size },
      imageUrl: uniqueVariantImageUrl(productSlug, slugify(`${pick(['Black', 'White', 'Navy'], sizeIndex)}-${size}`)),
      isDefault: sizeIndex === 0,
      isActive: true,
    }));
  }

  if (seed.variantKind === 'shoe') {
    return ['EU 40', 'EU 41', 'EU 42'].map((size, sizeIndex) => ({
      sku: `${slug}-${size.replace(' ', '')}`,
      name: `${pick(['White', 'Black', 'Red'], sizeIndex)} / ${size}`,
      priceVnd: seed.priceVnd,
      priceUsd: priceUsd(seed.priceVnd),
      stock: Math.max(1, Math.floor(seed.stock / 3)),
      weightGrams: 800,
      attributes: { color: pick(['White', 'Black', 'Red'], sizeIndex), size },
      imageUrl: uniqueVariantImageUrl(productSlug, slugify(`${pick(['White', 'Black', 'Red'], sizeIndex)}-${size}`)),
      isDefault: sizeIndex === 0,
      isActive: true,
    }));
  }

  if (seed.variantKind === 'book') {
    return [
      {
        sku: `${slug}-PAPERBACK`,
        name: 'Paperback',
        priceVnd: seed.priceVnd,
        priceUsd: priceUsd(seed.priceVnd),
        stock: seed.stock,
        weightGrams: 320,
        attributes: { format: 'Paperback', language: 'Vietnamese' },
        imageUrl: uniqueVariantImageUrl(productSlug, 'paperback'),
        isDefault: true,
        isActive: true,
      },
    ];
  }

  return [];
}

async function createProducts(categories: Map<string, string>, tags: Map<string, string>) {
  const products: CreatedProduct[] = [];
  const variants = new Map<string, CreatedVariant[]>();

  for (const [index, seed] of productSeeds.entries()) {
    const categoryId = categories.get(seed.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${seed.categorySlug}`);

    const slug = slugify(seed.name);
    const images = IMAGE_POOLS[seed.imageKey].map((_url, imageIndex) => ({
      url: uniqueProductImageUrl(slug, imageIndex),
      alt: `${seed.name} image ${imageIndex + 1}`,
      isPrimary: imageIndex === 0,
    }));

    const product = await prisma.product.create({
      data: {
        name: seed.name,
        slug,
        sku: `LSP-${String(index + 1).padStart(4, '0')}`,
        description: `${seed.name} is part of the balanced Lishop demo catalog. It includes realistic pricing, stock, images, tags, and related order history for testing storefront and admin workflows.`,
        priceVnd: seed.priceVnd,
        priceUsd: priceUsd(seed.priceVnd),
        stock: seed.stock,
        weightGrams: seed.categorySlug === 'furniture' ? 12000 : seed.categorySlug === 'laptops' ? 1600 : 500,
        categoryId,
        images: { create: images },
      },
    });

    products.push(product);
    variants.set(slug, []);

    for (const variantData of buildVariants(seed)) {
      const variant = await prisma.productVariant.create({
        data: {
          ...variantData,
          productId: product.id,
        },
      });
      variants.get(slug)?.push(variant);
    }

    for (const tagName of seed.tags) {
      const tagId = tags.get(tagName);
      if (!tagId) continue;
      await prisma.productTag.create({
        data: {
          productId: product.id,
          tagId,
        },
      });
    }

    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: StockMovementType.ADMIN_ADJUSTMENT,
        delta: seed.stock,
        balanceAfter: seed.stock,
        note: 'Initial demo stock',
        createdAt: daysAgo(35 - (index % 10)),
      },
    });
  }

  return { products, variants };
}

async function createPromotions(products: CreatedProduct[]) {
  const coupons = [
    { code: 'WELCOME10', type: CouponType.PERCENT, value: 10, minOrderVnd: 500000, maxUses: 1000, expiresAt: daysFromNow(30) },
    { code: 'SALE50K', type: CouponType.FIXED, value: 50000, minOrderVnd: 300000, maxUses: 500, expiresAt: daysFromNow(15) },
    { code: 'FREESHIP', type: CouponType.FREE_SHIPPING, value: 0, minOrderVnd: 200000, maxUses: null, expiresAt: null },
    { code: 'VIP20', type: CouponType.PERCENT, value: 20, minOrderVnd: 2000000, maxUses: 100, expiresAt: daysFromNow(7) },
    { code: 'TECH15', type: CouponType.PERCENT, value: 15, minOrderVnd: 10000000, maxUses: 200, expiresAt: daysFromNow(20) },
    { code: 'HOME100K', type: CouponType.FIXED, value: 100000, minOrderVnd: 1000000, maxUses: 300, expiresAt: daysFromNow(45) },
    { code: 'BEAUTY8', type: CouponType.PERCENT, value: 8, minOrderVnd: 250000, maxUses: 600, expiresAt: daysFromNow(25) },
    { code: 'EXPIRED5', type: CouponType.PERCENT, value: 5, minOrderVnd: 100000, maxUses: 50, expiresAt: daysAgo(3), isActive: false },
  ];

  const createdCoupons = [];
  for (const coupon of coupons) {
    createdCoupons.push(await prisma.coupon.create({
      data: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderVnd: coupon.minOrderVnd,
        maxUses: coupon.maxUses,
        usedCount: coupon.code === 'EXPIRED5' ? 50 : 0,
        expiresAt: coupon.expiresAt,
        isActive: coupon.isActive ?? true,
      },
    }));
  }

  for (let saleIndex = 0; saleIndex < 3; saleIndex++) {
    const flashSale = await prisma.flashSale.create({
      data: {
        startAt: saleIndex === 2 ? daysFromNow(3) : daysAgo(1 + saleIndex * 7),
        endAt: saleIndex === 2 ? daysFromNow(10) : daysFromNow(3 + saleIndex * 5),
        isActive: saleIndex !== 2,
      },
    });

    for (let i = 0; i < 5; i++) {
      const product = products[saleIndex * 5 + i];
      await prisma.flashSaleItem.create({
        data: {
          flashSaleId: flashSale.id,
          productId: product.id,
          discountPercent: 10 + saleIndex * 5 + i,
        },
      });
    }
  }

  return createdCoupons;
}

async function createWallets(customers: CreatedUser[]) {
  for (const [index, user] of customers.entries()) {
    const startingBalance = 500000 + index * 120000;
    const wallet = await prisma.wallet.create({
      data: {
        userId: user.id,
        balanceVnd: startingBalance,
      },
    });

    const txs = [
      { type: WalletTxType.TOPUP, amountVnd: startingBalance, balanceAfter: startingBalance, description: 'Initial demo topup' },
      { type: WalletTxType.PAYMENT, amountVnd: -150000, balanceAfter: startingBalance - 150000, description: 'Demo wallet payment' },
      { type: WalletTxType.REFUND, amountVnd: 50000, balanceAfter: startingBalance - 100000, description: 'Demo refund credit' },
    ];

    for (const [txIndex, tx] of txs.entries()) {
      await prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: tx.type,
          amountVnd: tx.amountVnd,
          balanceAfter: tx.balanceAfter,
          description: tx.description,
          createdAt: daysAgo(20 - txIndex * 4 - index),
        },
      });
    }
  }
}

async function createOrders(
  customers: CreatedUser[],
  addresses: Array<{ id: string }>,
  products: CreatedProduct[],
  variants: Map<string, CreatedVariant[]>,
  coupons: Array<{ id: string }>,
) {
  const statuses = [
    OrderStatus.PENDING,
    OrderStatus.PROCESSING,
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
    OrderStatus.CANCELLED,
    OrderStatus.REFUNDED,
  ];
  const methods = [PaymentMethod.COD, PaymentMethod.MOMO, PaymentMethod.VNPAY, PaymentMethod.WALLET, PaymentMethod.STRIPE, PaymentMethod.PAYPAL];
  const orders: Array<{ order: CreatedOrder; items: CreatedOrderItem[] }> = [];

  for (let index = 0; index < 30; index++) {
    const user = pick(customers, index);
    const address = addresses[customers.indexOf(user)];
    const status = statuses[index % statuses.length];
    const orderDate = daysAgo(45 - index);
    const itemCount = 1 + (index % 4);
    const selectedProducts = Array.from({ length: itemCount }, (_, itemIndex) => products[(index * 3 + itemIndex) % products.length]);
    const discountVnd = index % 5 === 0 ? 50000 : index % 7 === 0 ? 100000 : 0;
    const shippingFeeVnd = status === OrderStatus.DELIVERED || index % 4 === 0 ? 0 : 30000 + (index % 3) * 10000;

    const orderItems = selectedProducts.map((product, itemIndex) => {
      const quantity = 1 + ((index + itemIndex) % 2);
      const productVariants = variants.get(product.slug) ?? [];
      const variant = productVariants.length ? pick(productVariants, index + itemIndex) : null;
      const unitPriceVnd = variant?.priceVnd ?? product.priceVnd;

      return {
        product,
        variant,
        quantity,
        unitPriceVnd,
        totalPriceVnd: unitPriceVnd * quantity,
      };
    });

    const subtotalVnd = orderItems.reduce((sum, item) => sum + item.totalPriceVnd, 0);
    const totalVnd = Math.max(0, subtotalVnd + shippingFeeVnd - discountVnd);

    const paymentStatus = status === OrderStatus.CANCELLED || status === OrderStatus.REFUNDED
      ? PaymentStatus.REFUNDED
      : status === OrderStatus.PENDING
        ? PaymentStatus.PENDING
        : PaymentStatus.COMPLETED;

    const order = await prisma.order.create({
      data: {
        orderNumber: `LS-${String(index + 1).padStart(5, '0')}`,
        userId: user.id,
        addressId: address.id,
        status,
        shippingProvider: pick([ShippingProvider.GHN, ShippingProvider.GHTK, ShippingProvider.VIETTEL_POST], index),
        subtotalVnd,
        shippingFeeVnd,
        discountVnd,
        totalVnd,
        notes: index % 6 === 0 ? 'Please call before delivery.' : null,
        trackingNumber: status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED ? `TRK${100000 + index}` : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      },
    });

    const createdItems: CreatedOrderItem[] = [];
    for (const item of orderItems) {
      createdItems.push(await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          variantId: item.variant?.id,
          productName: item.product.name,
          variantName: item.variant?.name,
          variantSku: item.variant?.sku,
          variantAttributes: item.variant?.attributes ?? undefined,
          quantity: item.quantity,
          unitPriceVnd: item.unitPriceVnd,
          totalPriceVnd: item.totalPriceVnd,
        },
      }));
    }

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: pick(methods, index),
        amountVnd: totalVnd,
        status: paymentStatus,
        providerRef: paymentStatus === PaymentStatus.COMPLETED ? `PAY-${10000 + index}` : null,
        invoiceUrl: paymentStatus === PaymentStatus.COMPLETED ? `https://lishop.local/invoices/LS-${String(index + 1).padStart(5, '0')}.pdf` : null,
        createdAt: orderDate,
        updatedAt: orderDate,
      },
    });

    if (status === OrderStatus.SHIPPED || status === OrderStatus.DELIVERED) {
      const shipment = await prisma.shipment.create({
        data: {
          orderId: order.id,
          provider: order.shippingProvider,
          trackingNumber: order.trackingNumber,
          estimatedAt: daysAgo(42 - index),
          shippedAt: daysAgo(44 - index),
          deliveredAt: status === OrderStatus.DELIVERED ? daysAgo(41 - index) : null,
        },
      });

      for (const [eventIndex, description] of ['Order accepted', 'Picked up', 'In transit', 'Delivered'].entries()) {
        if (description === 'Delivered' && status !== OrderStatus.DELIVERED) continue;
        await prisma.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            status: description.toUpperCase().replace(/ /g, '_'),
            location: pick(['Ho Chi Minh City', 'Da Nang', 'Ha Noi', 'Can Tho'], index + eventIndex),
            description,
            createdAt: new Date(orderDate.getTime() + eventIndex * DAY),
          },
        });
      }
    }

    if (paymentStatus === PaymentStatus.COMPLETED || status === OrderStatus.DELIVERED || status === OrderStatus.SHIPPED) {
      const vatVnd = Math.round(subtotalVnd * 0.1);
      await prisma.invoice.create({
        data: {
          orderId: order.id,
          userId: user.id,
          invoiceNo: `INV-${String(index + 1).padStart(5, '0')}`,
          billingName: `${user.firstName} ${user.lastName}`,
          billingEmail: user.email,
          billingAddress: `Address ${index + 1}`,
          billingPhone: `09${String(index + 30000000).slice(0, 8)}`,
          subtotalVnd,
          discountVnd,
          shippingFeeVnd,
          vatPercent: 10,
          vatVnd,
          totalVnd: totalVnd + vatVnd,
          issuedAt: orderDate,
        },
      });
    }

    if (index < coupons.length && index < customers.length) {
      await prisma.couponUsage.create({
        data: {
          couponId: coupons[index % coupons.length].id,
          userId: user.id,
          usedAt: orderDate,
        },
      });
    }

    orders.push({ order, items: createdItems });
  }

  for (const coupon of coupons) {
    const usedCount = await prisma.couponUsage.count({ where: { couponId: coupon.id } });
    await prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount } });
  }

  return orders;
}

async function createReturnsAndRefunds(orders: Array<{ order: CreatedOrder; items: CreatedOrderItem[] }>) {
  const eligibleOrders = orders.filter(({ order }) => [OrderStatus.DELIVERED, OrderStatus.REFUNDED].includes(order.status));

  for (let index = 0; index < 6; index++) {
    const { order, items } = eligibleOrders[index];
    const status = pick([ReturnStatus.PENDING, ReturnStatus.APPROVED, ReturnStatus.RECEIVED, ReturnStatus.COMPLETED], index);
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        status,
        reason: pick([ReturnReason.DAMAGED, ReturnReason.WRONG_ITEM, ReturnReason.NOT_AS_DESCRIBED, ReturnReason.CHANGED_MIND], index),
        description: 'Demo return request for admin workflow.',
        adminNote: status === ReturnStatus.PENDING ? null : 'Reviewed by demo admin.',
        createdAt: daysAgo(12 - index),
        updatedAt: daysAgo(10 - index),
      },
    });

    await prisma.returnItem.create({
      data: {
        returnRequestId: returnRequest.id,
        orderItemId: items[0].id,
        quantity: 1,
      },
    });

    if (index < 5) {
      await prisma.refund.create({
        data: {
          orderId: order.id,
          returnId: returnRequest.id,
          userId: order.userId,
          amountVnd: Math.min(order.totalVnd, items[0].totalPriceVnd),
          method: pick([RefundMethod.ORIGINAL_PAYMENT, RefundMethod.WALLET, RefundMethod.MANUAL], index),
          status: pick([RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.COMPLETED], index),
          reason: 'Refund for demo return.',
          adminNote: 'Seeded refund record.',
          processedAt: index % 2 === 0 ? daysAgo(4 - index) : null,
          createdAt: daysAgo(9 - index),
          updatedAt: daysAgo(6 - index),
        },
      });
    }
  }
}

async function createReviews(customers: CreatedUser[], products: CreatedProduct[]) {
  const comments = [
    'Product quality is better than expected and delivery was fast.',
    'Good value for the price, packaging was clean and careful.',
    'I like the design and the product matched the listing.',
    'Useful for daily work, would recommend to friends.',
    'Customer support answered quickly when I asked about delivery.',
  ];

  const reviewPairs = new Set<string>();
  for (let index = 0; index < 70; index++) {
    const product = products[index % products.length];
    const user = customers[(index * 3) % customers.length];
    const key = `${product.id}:${user.id}`;
    if (reviewPairs.has(key)) continue;
    reviewPairs.add(key);

    await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: 3 + (index % 3),
        content: pick(comments, index),
        status: index % 12 === 0 ? ReviewStatus.PENDING : ReviewStatus.APPROVED,
        verifiedPurchase: index % 5 !== 0,
        createdAt: daysAgo(index % 40),
      },
    });
  }

  for (const product of products) {
    const aggregate = await prisma.review.aggregate({
      where: {
        productId: product.id,
        status: ReviewStatus.APPROVED,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: Number((aggregate._avg.rating ?? 0).toFixed(1)),
        reviewCount: aggregate._count.rating,
      },
    });
  }
}

async function createCustomerActivity(customers: CreatedUser[], products: CreatedProduct[], variants: Map<string, CreatedVariant[]>) {
  for (const [userIndex, user] of customers.entries()) {
    await prisma.deviceToken.create({
      data: {
        userId: user.id,
        token: `demo-device-token-${userIndex + 1}`,
        platform: pick(['ios', 'android', 'web'], userIndex),
      },
    });

    for (const eventType of ['ORDER_STATUS', 'PROMOTION', 'SUPPORT']) {
      await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          eventType,
          emailEnabled: true,
          pushEnabled: userIndex % 3 !== 0,
          inAppEnabled: true,
        },
      });
    }

    for (let itemIndex = 0; itemIndex < 3; itemIndex++) {
      const product = products[(userIndex * 5 + itemIndex) % products.length];
      await prisma.wishlist.create({
        data: {
          userId: user.id,
          productId: product.id,
          createdAt: daysAgo(itemIndex + userIndex),
        },
      });
    }

    if (userIndex < 7) {
      const product = products[(userIndex * 4) % products.length];
      const productVariants = variants.get(product.slug) ?? [];
      const variant = productVariants[0] ?? null;
      await prisma.cartItem.create({
        data: {
          userId: user.id,
          productId: product.id,
          variantId: variant?.id,
          quantity: 1 + (userIndex % 2),
        },
      });
    }

    for (let pointIndex = 0; pointIndex < 3; pointIndex++) {
      await prisma.loyaltyPoint.create({
        data: {
          userId: user.id,
          points: 50 + userIndex * 10 + pointIndex * 20,
          description: pick(['Welcome bonus', 'Order reward', 'Campaign bonus'], pointIndex),
          createdAt: daysAgo(30 - userIndex - pointIndex),
        },
      });
    }

    for (let notificationIndex = 0; notificationIndex < 6; notificationIndex++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: pick(['Order update', 'Flash sale', 'Coupon available', 'Support reply', 'Loyalty points added'], notificationIndex),
          body: 'This is seeded demo notification content for user workflows.',
          type: pick(['ORDER', 'PROMOTION', 'COUPON', 'SUPPORT', 'LOYALTY'], notificationIndex),
          relatedId: null,
          isRead: notificationIndex % 2 === 0,
          createdAt: daysAgo(notificationIndex + userIndex),
        },
      });
    }
  }
}

async function createSupport(customers: CreatedUser[], admin: CreatedUser, orders: Array<{ order: CreatedOrder }>) {
  const categories = [TicketCategory.ORDER, TicketCategory.PRODUCT, TicketCategory.SHIPPING, TicketCategory.PAYMENT, TicketCategory.RETURN, TicketCategory.OTHER];
  const statuses = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];

  for (let index = 0; index < 10; index++) {
    const user = customers[index % customers.length];
    const order = orders[index % orders.length].order;
    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        orderRef: order.orderNumber,
        category: pick(categories, index),
        subject: pick([
          'Need help with delivery',
          'Question about product warranty',
          'Payment confirmation request',
          'Return request follow up',
          'Coupon did not apply',
        ], index),
        status: pick(statuses, index),
        createdAt: daysAgo(14 - index),
        updatedAt: daysAgo(12 - index),
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        isAdmin: false,
        content: 'Can you help me check this demo issue?',
        createdAt: daysAgo(14 - index),
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: admin.id,
        isAdmin: true,
        content: 'Support team has received your request and is checking it.',
        createdAt: daysAgo(13 - index),
      },
    });
  }

  const faqs = [
    ['How do I track my order?', 'Open Orders and select tracking to see shipment events.', 'orders'],
    ['How long does delivery take?', 'Standard delivery takes 1-5 business days depending on city.', 'shipping'],
    ['Can I return a product?', 'Delivered orders can be returned when they meet the return policy.', 'returns'],
    ['How do coupons work?', 'Enter an active coupon code in cart or checkout before payment.', 'promotions'],
    ['Which payment methods are supported?', 'Lishop supports COD, wallet, VNPAY, MOMO, PayPal, and Stripe.', 'payments'],
    ['How are loyalty points earned?', 'Completed orders and campaigns can add points to your account.', 'wallet'],
    ['Can I update my address?', 'Go to Profile and manage addresses before placing an order.', 'profile'],
    ['How do I contact support?', 'Create a support ticket from the support page.', 'support'],
    ['Why is a review pending?', 'Some reviews wait for admin moderation before publishing.', 'reviews'],
    ['How do flash sales work?', 'Flash sale discounts are active only during the sale window.', 'promotions'],
    ['Can invoices be downloaded?', 'Invoices are generated for paid orders.', 'invoices'],
    ['What happens after refund approval?', 'Refunds are processed to wallet, original payment, or manual transfer.', 'refunds'],
  ];

  for (const [index, [question, answer, category]] of faqs.entries()) {
    await prisma.fAQ.create({
      data: {
        question,
        answer,
        category,
        sortOrder: index + 1,
        isPublished: index !== 8,
      },
    });
  }
}

async function main() {
  console.warn('Seeding Lishop balanced demo data...');

  await cleanup();

  const { admin, customers } = await createUsers();
  const addresses = await createAddresses(customers);
  const categories = await createCategories();
  const tags = await createTags();
  const { products, variants } = await createProducts(categories, tags);
  const coupons = await createPromotions(products);

  await createWallets(customers);

  const orders = await createOrders(customers, addresses, products, variants, coupons);
  await createReturnsAndRefunds(orders);
  await createReviews(customers, products);
  await createCustomerActivity(customers, products, variants);
  await createSupport(customers, admin, orders);

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    productVariants: await prisma.productVariant.count(),
    orders: await prisma.order.count(),
    reviews: await prisma.review.count(),
    notifications: await prisma.notification.count(),
    wallets: await prisma.wallet.count(),
    invoices: await prisma.invoice.count(),
    refunds: await prisma.refund.count(),
    supportTickets: await prisma.supportTicket.count(),
    faqs: await prisma.fAQ.count(),
  };

  console.warn('Seed complete. Demo accounts:');
  console.warn('  Admin:     admin@lishop.vn / Admin@12345');
  console.warn('  Customer:  customer1@lishop.vn / Customer@123');
  console.warn('  Customers: customer1@lishop.vn through customer10@lishop.vn / Customer@123');
  console.warn('Record counts:', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
