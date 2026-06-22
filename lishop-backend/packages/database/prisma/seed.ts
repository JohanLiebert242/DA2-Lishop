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
  { name: 'Điện tử', slug: 'electronics', imageUrl: IMAGE_POOLS.phones[0] },
  { name: 'Thời trang', slug: 'fashion', imageUrl: IMAGE_POOLS.fashion[0] },
  { name: 'Nhà cửa', slug: 'home-living', imageUrl: IMAGE_POOLS.home[0] },
  { name: 'Thể thao', slug: 'sports', imageUrl: IMAGE_POOLS.fitness[0] },
  { name: 'Sách', slug: 'books', imageUrl: IMAGE_POOLS.books[0] },
  { name: 'Làm đẹp', slug: 'beauty', imageUrl: IMAGE_POOLS.beauty[0] },
] as const;

const childCategorySeeds = [
  { name: 'Điện thoại', slug: 'phones', parentSlug: 'electronics' },
  { name: 'Máy tính xách tay', slug: 'laptops', parentSlug: 'electronics' },
  { name: 'Âm thanh', slug: 'audio', parentSlug: 'electronics' },
  { name: 'Thời trang nam', slug: 'mens-wear', parentSlug: 'fashion' },
  { name: 'Thời trang nữ', slug: 'womens-wear', parentSlug: 'fashion' },
  { name: 'Giày dép', slug: 'shoes', parentSlug: 'fashion' },
  { name: 'Nhà bếp', slug: 'kitchen', parentSlug: 'home-living' },
  { name: 'Nội thất', slug: 'furniture', parentSlug: 'home-living' },
  { name: 'Trang trí', slug: 'decor', parentSlug: 'home-living' },
  { name: 'Thể hình', slug: 'fitness', parentSlug: 'sports' },
  { name: 'Sách kinh doanh', slug: 'business-books', parentSlug: 'books' },
  { name: 'Chăm sóc da', slug: 'skincare', parentSlug: 'beauty' },
] as const;

const productSeeds: ProductSeed[] = [
  // Deterministic slug for E2E layout test: /products/layout-product
  ...makeProducts('phones', 'phones', 'tech', [
    ['Layout Product', 19900000],
  ], 12),
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
  ...buildExpandedCatalog(),
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

function buildExpandedCatalog(): ProductSeed[] {
  const blueprints: Array<{
    brand: string;
    categorySlug: string;
    imageKey: keyof typeof IMAGE_POOLS;
    variantKind?: ProductSeed['variantKind'];
    labels: string[];
    basePrice: number;
    priceStep: number;
    baseStock: number;
  }> = [
    { brand: 'Apple', categorySlug: 'phones', imageKey: 'phones', variantKind: 'tech', labels: ['Vision', 'Air', 'Plus'], basePrice: 18990000, priceStep: 900000, baseStock: 24 },
    { brand: 'Samsung', categorySlug: 'phones', imageKey: 'phones', variantKind: 'tech', labels: ['Galaxy', 'Ultra', 'Neo'], basePrice: 13990000, priceStep: 750000, baseStock: 26 },
    { brand: 'Xiaomi', categorySlug: 'phones', imageKey: 'phones', variantKind: 'tech', labels: ['Redmi', 'Note', 'Ultra'], basePrice: 6990000, priceStep: 550000, baseStock: 30 },
    { brand: 'OPPO', categorySlug: 'phones', imageKey: 'phones', variantKind: 'tech', labels: ['Reno', 'Find', 'Air'], basePrice: 7990000, priceStep: 520000, baseStock: 28 },
    { brand: 'Google', categorySlug: 'phones', imageKey: 'phones', variantKind: 'tech', labels: ['Pixel', 'Pro', 'Fold'], basePrice: 14990000, priceStep: 850000, baseStock: 22 },
    { brand: 'ASUS', categorySlug: 'laptops', imageKey: 'laptops', variantKind: 'tech', labels: ['Zenbook', 'Vivobook', 'ROG'], basePrice: 16990000, priceStep: 1100000, baseStock: 20 },
    { brand: 'Dell', categorySlug: 'laptops', imageKey: 'laptops', variantKind: 'tech', labels: ['Inspiron', 'Latitude', 'XPS'], basePrice: 17990000, priceStep: 1250000, baseStock: 20 },
    { brand: 'Nike', categorySlug: 'shoes', imageKey: 'shoes', variantKind: 'shoe', labels: ['Run', 'Street', 'Training'], basePrice: 1490000, priceStep: 120000, baseStock: 36 },
    { brand: "Levi's", categorySlug: 'mens-wear', imageKey: 'fashion', variantKind: 'size', labels: ['Denim', 'Urban', 'Classic'], basePrice: 890000, priceStep: 90000, baseStock: 32 },
    { brand: 'Zara', categorySlug: 'womens-wear', imageKey: 'fashion', variantKind: 'size', labels: ['Studio', 'Soft', 'Daily'], basePrice: 790000, priceStep: 80000, baseStock: 34 },
    { brand: 'Philips', categorySlug: 'kitchen', imageKey: 'kitchen', labels: ['Home', 'Cook', 'Fresh'], basePrice: 990000, priceStep: 150000, baseStock: 26 },
    { brand: 'Kiehl', categorySlug: 'skincare', imageKey: 'beauty', labels: ['Daily', 'Glow', 'Repair'], basePrice: 520000, priceStep: 70000, baseStock: 40 },
    { brand: 'The Ordinary', categorySlug: 'skincare', imageKey: 'beauty', labels: ['Balance', 'Clear', 'Hydrate'], basePrice: 260000, priceStep: 35000, baseStock: 44 },
    { brand: 'La Roche Posay', categorySlug: 'skincare', imageKey: 'beauty', labels: ['Care', 'Barrier', 'Derm'], basePrice: 390000, priceStep: 45000, baseStock: 42 },
  ];

  const products: ProductSeed[] = [];

  for (const blueprint of blueprints) {
    for (let index = 1; index <= 30; index++) {
      const line = blueprint.labels[(index - 1) % blueprint.labels.length];
      products.push({
        name: `${blueprint.brand} ${line} Series ${String(index).padStart(2, '0')}`,
        categorySlug: blueprint.categorySlug,
        priceVnd: blueprint.basePrice + (index - 1) * blueprint.priceStep,
        stock: blueprint.baseStock + (index % 9) * 2,
        imageKey: blueprint.imageKey,
        variantKind: blueprint.variantKind,
        tags:
          index % 5 === 0
            ? ['sale', 'hot', 'bestseller']
            : index % 3 === 0
              ? ['new', 'premium']
              : ['hot', 'office'],
      });
    }
  }

  return products;
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

function uniqueProductImageUrl(slug: string, imageIndex: number, _baseUrl: string) {
  return `https://picsum.photos/seed/lishop-${slug}-${imageIndex}/900/675`;
}

function uniqueVariantImageUrl(productSlug: string, variantSlug: string, _baseUrl: string) {
  return `https://picsum.photos/seed/lishop-${productSlug}-${variantSlug}/900/675`;
}

function pick<T>(items: T[], index: number) {
  return items[index % items.length];
}

function inferBrand(productName: string) {
  const knownBrands = [
    'La Roche Posay',
    'The Ordinary',
    'New Balance',
    'Michael Kors',
    'LocknLock',
    'MacBook',
    'iPhone',
    'Samsung',
    'Xiaomi',
    'OPPO',
    'Google',
    'ASUS',
    'Dell',
    'Lenovo',
    'HP',
    'Acer',
    'Sony',
    'Apple',
    'JBL',
    'Marshall',
    'Lacoste',
    'Levis',
    'Oxford',
    'Zara',
    'Nike',
    'Adidas',
    'Converse',
    'Philips',
    'Dyson',
    'Bear',
    'Bowflex',
    'Garmin',
    'Kiehl',
  ];
  const match = knownBrands.find((brand) => productName.toLowerCase().startsWith(brand.toLowerCase()));
  if (match === 'MacBook' || match === 'iPhone') return 'Apple';
  return match ?? 'Lishop';
}

async function cleanup() {
  async function safe(op: () => Promise<unknown>) {
    try {
      await op();
    } catch (err) {
      // When the Prisma schema contains models that haven't been migrated yet,
      // Prisma throws P2021 (table does not exist). Keep the seed resilient.
      if (err && typeof err === 'object' && (err as { code?: unknown }).code === 'P2021') return;
      throw err;
    }
  }

  await safe(() => prisma.refund.deleteMany({}));
  await safe(() => prisma.returnItem.deleteMany({}));
  await safe(() => prisma.returnRequest.deleteMany({}));
  await safe(() => prisma.invoice.deleteMany({}));
  await safe(() => prisma.walletTransaction.deleteMany({}));
  await safe(() => prisma.wallet.deleteMany({}));
  await safe(() => prisma.ticketMessage.deleteMany({}));
  await safe(() => prisma.supportTicket.deleteMany({}));
  await safe(() => prisma.fAQ.deleteMany({}));
  await safe(() => prisma.wishlist.deleteMany({}));
  await safe(() => prisma.cartItem.deleteMany({}));
  await safe(() => prisma.notificationPreference.deleteMany({}));
  await safe(() => prisma.deviceToken.deleteMany({}));
  await safe(() => prisma.notification.deleteMany({}));
  await safe(() => prisma.loyaltyPoint.deleteMany({}));
  await safe(() => prisma.review.deleteMany({}));
  await safe(() => prisma.shipmentEvent.deleteMany({}));
  await safe(() => prisma.shipment.deleteMany({}));
  await safe(() => prisma.payment.deleteMany({}));
  await safe(() => prisma.orderItem.deleteMany({}));
  await safe(() => prisma.order.deleteMany({}));
  await safe(() => prisma.couponUsage.deleteMany({}));
  await safe(() => prisma.coupon.deleteMany({}));
  await safe(() => prisma.flashSaleItem.deleteMany({}));
  await safe(() => prisma.flashSale.deleteMany({}));
  await safe(() => prisma.stockMovement.deleteMany({}));
  await safe(() => prisma.productTag.deleteMany({}));
  await safe(() => prisma.tag.deleteMany({}));
  await safe(() => prisma.productVariant.deleteMany({}));
  await safe(() => prisma.productImage.deleteMany({}));
  await safe(() => prisma.product.deleteMany({}));
  await safe(() => prisma.category.deleteMany({}));
  await safe(() => prisma.address.deleteMany({}));
  await safe(() => prisma.user.deleteMany({}));
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
    ['Nguyễn Văn', 'An'],
    ['Trần Thị', 'Bình'],
    ['Lê Minh', 'Châu'],
    ['Phạm Quốc', 'Dũng'],
    ['Hoàng Gia', 'Hân'],
    ['Đỗ Anh', 'Khoa'],
    ['Võ Thanh', 'Linh'],
    ['Bùi Ngọc', 'Mai'],
    ['Đặng Tuấn', 'Nam'],
    ['Phan Mỹ', 'Quyên'],
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
    ['12 Lê Lợi', 'Quận 1', 'Thành phố Hồ Chí Minh'],
    ['45 Nguyễn Huệ', 'Quận 3', 'Thành phố Hồ Chí Minh'],
    ['78 Hoàng Diệu', 'Hải Châu', 'Đà Nẵng'],
    ['101 Trần Phú', 'Ba Đình', 'Hà Nội'],
    ['22 Bạch Đằng', 'Ninh Kiều', 'Cần Thơ'],
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
  const imagePool = [...IMAGE_POOLS[seed.imageKey]];
  const variantImage = (variantSlug: string, index: number) =>
    uniqueVariantImageUrl(productSlug, variantSlug, pick(imagePool, index));

  if (seed.variantKind === 'tech') {
    return [
      {
        sku: `${slug}-STD`,
        name: 'Tiêu chuẩn',
        priceVnd: seed.priceVnd,
        priceUsd: priceUsd(seed.priceVnd),
        stock: Math.max(1, Math.floor(seed.stock * 0.6)),
        weightGrams: seed.categorySlug === 'laptops' ? 1600 : 450,
        attributes: { color: 'Xám than', storage: seed.categorySlug === 'phones' ? '256GB' : '512GB' },
        imageUrl: variantImage('standard', 0),
        isDefault: true,
        isActive: true,
      },
      {
        sku: `${slug}-PLUS`,
        name: 'Cao cấp',
        priceVnd: seed.priceVnd + Math.round(seed.priceVnd * 0.15),
        priceUsd: priceUsd(seed.priceVnd + Math.round(seed.priceVnd * 0.15)),
        stock: Math.max(1, Math.floor(seed.stock * 0.4)),
        weightGrams: seed.categorySlug === 'laptops' ? 1700 : 470,
        attributes: { color: 'Bạc', storage: seed.categorySlug === 'phones' ? '512GB' : '1TB' },
        imageUrl: variantImage('plus', 1),
        isDefault: false,
        isActive: true,
      },
    ];
  }

  if (seed.variantKind === 'size') {
    return ['S', 'M', 'L'].map((size, sizeIndex) => ({
      sku: `${slug}-${size}`,
      name: `${pick(['Đen', 'Trắng', 'Xanh navy'], sizeIndex)} / ${size}`,
      priceVnd: seed.priceVnd + sizeIndex * 50000,
      priceUsd: priceUsd(seed.priceVnd + sizeIndex * 50000),
      stock: Math.max(1, Math.floor(seed.stock / 3)),
      weightGrams: 350,
      attributes: { color: pick(['Đen', 'Trắng', 'Xanh navy'], sizeIndex), size },
      imageUrl: variantImage(slugify(`${pick(['den', 'trang', 'xanh-navy'], sizeIndex)}-${size}`), sizeIndex),
      isDefault: sizeIndex === 0,
      isActive: true,
    }));
  }

  if (seed.variantKind === 'shoe') {
    return ['EU 40', 'EU 41', 'EU 42'].map((size, sizeIndex) => ({
      sku: `${slug}-${size.replace(' ', '')}`,
      name: `${pick(['Trắng', 'Đen', 'Đỏ'], sizeIndex)} / ${size}`,
      priceVnd: seed.priceVnd,
      priceUsd: priceUsd(seed.priceVnd),
      stock: Math.max(1, Math.floor(seed.stock / 3)),
      weightGrams: 800,
      attributes: { color: pick(['Trắng', 'Đen', 'Đỏ'], sizeIndex), size },
      imageUrl: variantImage(slugify(`${pick(['trang', 'den', 'do'], sizeIndex)}-${size}`), sizeIndex),
      isDefault: sizeIndex === 0,
      isActive: true,
    }));
  }

  if (seed.variantKind === 'book') {
    return [
      {
        sku: `${slug}-PAPERBACK`,
        name: 'Bìa mềm',
        priceVnd: seed.priceVnd,
        priceUsd: priceUsd(seed.priceVnd),
        stock: seed.stock,
        weightGrams: 320,
        attributes: { format: 'Bìa mềm', language: 'Tiếng Việt' },
        imageUrl: variantImage('paperback', 0),
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
    const brand = inferBrand(seed.name);
    const imagePool = IMAGE_POOLS[seed.imageKey];
    const images = Array.from({ length: 4 }, (_, imageIndex) => ({
      url: uniqueProductImageUrl(slug, imageIndex, pick([...imagePool], imageIndex)),
      alt: `Ảnh ${imageIndex + 1} của ${seed.name}`,
      isPrimary: imageIndex === 0,
    }));

    const product = await prisma.product.create({
      data: {
        name: seed.name,
        slug,
        sku: `LSP-${String(index + 1).padStart(4, '0')}`,
        description: `${seed.name} thuộc bộ dữ liệu demo Lishop với thương hiệu ${brand}, giá bán thực tế, tồn kho, hình ảnh riêng và lịch sử đơn hàng để kiểm thử cửa hàng cùng trang quản trị.`,
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

    for (const tagName of [...seed.tags, `brand:${brand}`]) {
      let tagId = tags.get(tagName);
      if (!tagId) {
        const tag = await prisma.tag.create({ data: { name: tagName } });
        tagId = tag.id;
        tags.set(tagName, tagId);
      }
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
        note: 'Tồn kho demo ban đầu',
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
      { type: WalletTxType.TOPUP, amountVnd: startingBalance, balanceAfter: startingBalance, description: 'Nạp tiền demo ban đầu' },
      { type: WalletTxType.PAYMENT, amountVnd: -150000, balanceAfter: startingBalance - 150000, description: 'Thanh toán bằng ví demo' },
      { type: WalletTxType.REFUND, amountVnd: 50000, balanceAfter: startingBalance - 100000, description: 'Hoàn tiền demo vào ví' },
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
        notes: index % 6 === 0 ? 'Vui lòng gọi trước khi giao hàng.' : null,
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

      for (const [eventIndex, description] of ['Đã nhận đơn', 'Đã lấy hàng', 'Đang vận chuyển', 'Đã giao hàng'].entries()) {
        if (description === 'Đã giao hàng' && status !== OrderStatus.DELIVERED) continue;
        await prisma.shipmentEvent.create({
          data: {
            shipmentId: shipment.id,
            status: description.toUpperCase().replace(/ /g, '_'),
            location: pick(['Thành phố Hồ Chí Minh', 'Đà Nẵng', 'Hà Nội', 'Cần Thơ'], index + eventIndex),
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
          billingAddress: `Địa chỉ ${index + 1}`,
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
  const returnableStatuses: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.REFUNDED];
  const eligibleOrders = orders.filter(({ order }) => returnableStatuses.includes(order.status));

  for (let index = 0; index < 6; index++) {
    const { order, items } = eligibleOrders[index];
    const status = pick([ReturnStatus.PENDING, ReturnStatus.APPROVED, ReturnStatus.RECEIVED, ReturnStatus.COMPLETED], index);
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        status,
        reason: pick([ReturnReason.DAMAGED, ReturnReason.WRONG_ITEM, ReturnReason.NOT_AS_DESCRIBED, ReturnReason.CHANGED_MIND], index),
        description: 'Yêu cầu đổi trả demo cho quy trình quản trị.',
        adminNote: status === ReturnStatus.PENDING ? null : 'Quản trị viên demo đã xem xét.',
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
          reason: 'Hoàn tiền cho yêu cầu đổi trả demo.',
          adminNote: 'Bản ghi hoàn tiền demo.',
          processedAt: index % 2 === 0 ? daysAgo(4 - index) : null,
          createdAt: daysAgo(9 - index),
          updatedAt: daysAgo(6 - index),
        },
      });
    }
  }
}

async function createReviews(customers: CreatedUser[], products: CreatedProduct[]) {
  const reviews: {
    rating: number;
    content: string;
    status: ReviewStatus;
    verifiedPurchase: boolean;
  }[] = [
    // ─── Positive reviews ───
    { rating: 5, content: 'Sản phẩm rất tốt, chất lượng đúng như mô tả. Giao hàng nhanh, đóng gói cẩn thận. Sẽ ủng hộ lần sau.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 5, content: 'Mình rất hài lòng với sản phẩm này. Chất lượng vượt ngoài mong đợi, giá cả hợp lý. Team tư vấn nhiệt tình.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 4, content: 'Chất lượng ổn, giá tốt so với thị trường. Giao hàng hơi chậm nhưng được cái đóng gói rất kỹ.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 4, content: 'Hàng đúng hình, chất lượng tốt. Màu sắc đẹp như trong ảnh. Sẽ mua thêm cho người nhà.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 5, content: 'Lần đầu mua bên Lishop, khá ưng ý. Sản phẩm chất lượng, giá tốt, ship nhanh. Được tặng kèm voucher nữa.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 4, content: 'Mua tặng vợ, vợ mình rất thích. Thiết kế đẹp, sang trọng, phù hợp làm quà.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 5, content: 'Sản phẩm tuyệt vời! Chất lượng cao hơn giá tiền. Cảm ơn shop đã tư vấn tận tình.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 4, content: 'Dùng tốt, chất lượng ok. Sẽ order tiếp khi cần. Shop nên bổ sung thêm màu sắc để có nhiều lựa chọn hơn.', status: ReviewStatus.APPROVED, verifiedPurchase: true },

    // ─── Negative reviews ───
    { rating: 2, content: 'Sản phẩm nhận được không giống hình. Chất lượng khá tệ so với giá tiền. Rất thất vọng.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 1, content: 'Hàng bị lỗi, màu sắc không như hình. Đã liên hệ hỗ trợ nhưng chưa thấy phản hồi. Không hài lòng chút nào.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 1, content: 'Giao hàng quá chậm, đợi gần 2 tuần mới nhận được. Sản phẩm thì không được như quảng cáo. Phí ship cao.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 2, content: 'Đặt 2 cái nhưng chỉ nhận được 1. Nhắn shop bảo kiểm tra lại kho rồi im luôn. Không chuyên nghiệp.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 1, content: 'Sản phẩm kém chất lượng, dùng được 2 hôm đã hỏng. Gửi yêu cầu bảo hành thì bảo không đủ điều kiện. Phí tiền.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 2, content: 'Kích thước không đúng như bảng size shop đưa ra. Đổi trả thì mất công chờ đợi. Nên cập nhật lại bảng size.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 1, content: 'Mùi nhựa khó chịu khi mới mở hộp. Để 2 ngày vẫn còn mùi. Không dám dùng cho con nhỏ.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 2, content: 'Giá cao hơn so với các shop khác, mà chất lượng không khác gì. Ship cũng lâu. Mua lần đầu và cũng là lần cuối.', status: ReviewStatus.APPROVED, verifiedPurchase: true },

    // ─── Reviews with risky/spam content (for AI moderation) ───
    { rating: 5, content: 'Sản phẩm tốt, giá rẻ. Ai cần mua liên hệ Telegram: @fake_seller_channel để được giá tốt hơn.', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 5, content: 'Bán hàng chất lượng cao giá rẻ xem thêm tại https://fake-competitor-shop.com ưu đãi 50% hôm nay', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 1, content: 'LỪA ĐẢO! TOÀN HÀNG KÉM CHẤT LƯỢNG! ĐỪNG MUA! AI MUA LÀ NGU!', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 5, content: 'Mua ngay kẻo hết! Flash sale 99% tất cả sản phẩm! Click ngay: https://bit.ly/fake-promo-xyz', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 3, content: 'Tuyệt vời! facebook.com/fakepage lên hệ mua giá gốc không qua shop.', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 4, content: 'Chất lượng ok. Bạn nào muốn mua sỉ ib zalo 090xxxxxxx để được giá tốt.', status: ReviewStatus.PENDING, verifiedPurchase: false },

    // ─── Reviews with offensive/profane language (for AI moderation) ───
    { rating: 1, content: 'Cái shop chó chết này bán hàng như c*t. Giao hàng như l*n. Đừng có ai mua vào đây!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Đ**! Mua thằng lolz này đúng phí tiền. Hàng như c*t. Không đáng một xu!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Shop lừa đảo! Đm chúng mày bán hàng dởm còn chối. Tao đã tốn công đi kiểm tra hàng thì biết ngay. Lũ khốn nạn!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 2, content: 'Sản phẩm tệ vãi cả đái. Tưởng mua được đồ tốt ai ngờ toàn đồ dỏm. Shop bán hàng như vậy thì đóng cửa đi!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Nhận hàng xong muốn ném thẳng vào thùng rác. Cái đống phế liệu này mà gọi là sản phẩm? Khinh!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Ngu xuẩn mới mua hàng ở đây. Vừa mắc vừa dởm. Bọn bán hàng chỉ biết hốt bạc chứ không biết gì!', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Thất vọng vl. Mua cho con mà nhận được cục cứt. Shop bán hàng như thế này thì ác thật sự.', status: ReviewStatus.PENDING, verifiedPurchase: true },

    // ─── Reviews with discriminatory/hateful content (for AI moderation) ───
    { rating: 1, content: 'Shop toàn bán đồ Tàu khằn giá cao. Toàn hàng đểu của mấy thằng Tàu, nhìn đã biết không dám dùng.', status: ReviewStatus.PENDING, verifiedPurchase: false },
    { rating: 1, content: 'Nhân viên tư vấn như cái đồ ngu, hỏi gì cũng không biết. Chắc toàn tuyển người vô học, mất dạy về làm.', status: ReviewStatus.PENDING, verifiedPurchase: false },

    // ─── Mixed/neutral reviews ───
    { rating: 3, content: 'Sản phẩm tạm được, không quá tệ nhưng cũng không xuất sắc. Giá hơi cao so với chất lượng.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 3, content: 'Chất lượng ở mức trung bình. Giao hàng đúng hẹn, đóng gói ổn. Hy vọng shop cải thiện chất lượng hơn.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 3, content: 'Cũng được, không có gì nổi bật. Đúng giá tiền. Tạm chấp nhận được.', status: ReviewStatus.APPROVED, verifiedPurchase: true },
    { rating: 3, content: 'Bình thường, không quá tệ. Shop nên đầu tư hơn vào bao bì sản phẩm.', status: ReviewStatus.APPROVED, verifiedPurchase: true },

    // ─── Pending reviews for moderation (normal) ───
    { rating: 4, content: 'Sản phẩm tạm ổn. Đợi dùng thêm thời gian nữa mới đánh giá chính xác được. Shop nên cải thiện chất lượng.', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 5, content: 'Rất tốt! Shop phục vụ chu đáo, sản phẩm chất lượng. Sẽ tiếp tục ủng hộ dài dài.', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 2, content: 'Shop giao thiếu phụ kiện kèm theo. Đã liên hệ nhưng chưa được giải quyết. Mong shop xem lại.', status: ReviewStatus.PENDING, verifiedPurchase: true },
    { rating: 1, content: 'Hàng nhận được bị trầy xước, đã gửi ảnh cho shop nhưng chưa thấy phản hồi. Thất vọng.', status: ReviewStatus.PENDING, verifiedPurchase: true },
  ];

  const reviewPairs = new Set<string>();
  for (let index = 0; index < reviews.length; index++) {
    const review = reviews[index];
    const product = products[index % products.length];
    const user = customers[(index * 3) % customers.length];
    const key = `${product.id}:${user.id}`;
    if (reviewPairs.has(key)) continue;
    reviewPairs.add(key);

    await prisma.review.create({
      data: {
        productId: product.id,
        userId: user.id,
        rating: review.rating,
        content: review.content,
        status: review.status,
        verifiedPurchase: review.verifiedPurchase,
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
          description: pick(['Điểm chào mừng', 'Thưởng đơn hàng', 'Thưởng chiến dịch'], pointIndex),
          createdAt: daysAgo(30 - userIndex - pointIndex),
        },
      });
    }

    for (let notificationIndex = 0; notificationIndex < 6; notificationIndex++) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: pick(['Cập nhật đơn hàng', 'Flash sale', 'Có coupon mới', 'Phản hồi hỗ trợ', 'Đã cộng điểm thưởng'], notificationIndex),
          body: 'Đây là nội dung thông báo demo cho luồng người dùng.',
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
          'Cần hỗ trợ về giao hàng',
          'Hỏi về bảo hành sản phẩm',
          'Yêu cầu xác nhận thanh toán',
          'Theo dõi yêu cầu đổi trả',
          'Coupon không áp dụng được',
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
        content: 'Bạn có thể giúp mình kiểm tra vấn đề demo này không?',
        createdAt: daysAgo(14 - index),
      },
    });

    await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: admin.id,
        isAdmin: true,
        content: 'Đội ngũ hỗ trợ đã nhận yêu cầu và đang kiểm tra.',
        createdAt: daysAgo(13 - index),
      },
    });
  }

  const faqs = [
    ['Làm sao để theo dõi đơn hàng?', 'Mở trang Đơn hàng và chọn theo dõi để xem các mốc vận chuyển.', 'orders'],
    ['Thời gian giao hàng mất bao lâu?', 'Giao hàng tiêu chuẩn thường mất 1-5 ngày làm việc tùy khu vực.', 'shipping'],
    ['Tôi có thể đổi trả sản phẩm không?', 'Đơn đã giao có thể đổi trả khi đáp ứng chính sách đổi trả.', 'returns'],
    ['Coupon hoạt động như thế nào?', 'Nhập mã coupon còn hiệu lực trong giỏ hàng hoặc thanh toán trước khi trả tiền.', 'promotions'],
    ['Lishop hỗ trợ phương thức thanh toán nào?', 'Lishop hỗ trợ COD, ví, VNPAY, MOMO, PayPal và Stripe.', 'payments'],
    ['Điểm thưởng được tích như thế nào?', 'Đơn hoàn tất và các chiến dịch có thể cộng điểm vào tài khoản của bạn.', 'wallet'],
    ['Tôi có thể cập nhật địa chỉ không?', 'Vào Hồ sơ để quản lý địa chỉ trước khi đặt hàng.', 'profile'],
    ['Làm sao để liên hệ hỗ trợ?', 'Tạo phiếu hỗ trợ từ trang Hỗ trợ.', 'support'],
    ['Vì sao đánh giá đang chờ duyệt?', 'Một số đánh giá cần quản trị viên kiểm duyệt trước khi hiển thị.', 'reviews'],
    ['Flash sale hoạt động ra sao?', 'Ưu đãi flash sale chỉ có hiệu lực trong khung thời gian mở bán.', 'promotions'],
    ['Có thể tải hóa đơn không?', 'Hóa đơn được tạo cho các đơn hàng đã thanh toán.', 'invoices'],
    ['Sau khi duyệt hoàn tiền thì sao?', 'Khoản hoàn tiền được xử lý vào ví, phương thức thanh toán gốc hoặc chuyển khoản thủ công.', 'refunds'],
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
  console.warn('Đang seed dữ liệu demo Lishop...');

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
  try {
    await createSupport(customers, admin, orders);
  } catch (err) {
    if (err && typeof err === 'object' && (err as { code?: unknown }).code === 'P2021') {
      console.warn('[seed] support ticket tables missing; skipping support seed');
    } else {
      throw err;
    }
  }

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
    supportTickets: await prisma.supportTicket.count().catch(() => 0),
    faqs: await prisma.fAQ.count().catch(() => 0),
  };

  console.warn('Seed hoàn tất. Tài khoản demo:');
  console.warn('  Admin:     admin@lishop.vn / Admin@12345');
  console.warn('  Khách hàng: customer1@lishop.vn / Customer@123');
  console.warn('  Danh sách khách hàng: customer1@lishop.vn đến customer10@lishop.vn / Customer@123');
  console.warn('Số bản ghi:', counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
