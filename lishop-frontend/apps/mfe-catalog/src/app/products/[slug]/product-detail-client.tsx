'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { toast } from '@lishop/ui';
import { catalogApi, ProductDetail, ProductVariant, ReviewInfo } from '../../../lib/catalog-api';
import { RelatedProducts } from '../../../components/related-products';
import { addToCart, flyToCart } from '../../../lib/cart-helper';
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../../../lib/wishlist-api';
import { ChatWidget } from '../../../components/chat-widget';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';

const ATTRIBUTE_LABELS: Record<string, string> = {
  color: 'Mau sac',
  size: 'Kich co',
  storage: 'Dung luong',
  format: 'Dinh dang',
};

function formatAttributeLabel(key: string) {
  return ATTRIBUTE_LABELS[key.toLowerCase()] ?? key;
}

function getVariantLabel(variant: ProductVariant) {
  const attrs = Object.entries(variant.attributes ?? {})
    .map(([, value]) => value)
    .filter(Boolean);

  return attrs.length > 0 ? attrs.join(' / ') : variant.name;
}

function Stars({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onClick={() => interactive && onSelect?.(s)}
          className={`${s <= rating ? 'text-yellow-400' : 'text-stone-300'} ${interactive ? 'cursor-pointer text-2xl select-none' : 'text-base'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [isLoggedInNow, setIsLoggedInNow] = useState(false);

  useEffect(() => {
    setIsLoggedInNow(isLoggedIn());
  }, []);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => catalogApi.getProductReviews(productId),
  });

  const submitMutation = useMutation({
    mutationFn: () => catalogApi.createReview(productId, rating, content || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      setShowForm(false);
      setContent('');
      setRating(5);
      toast.success('Đánh giá của bạn đã được gửi!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gửi đánh giá thất bại, vui lòng thử lại');
    },
  });

  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    pct: reviews.length > 0
      ? (reviews.filter((r) => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const sortedReviews = [...reviews].sort((a, b) => {
    if (sortOrder === 'highest') return b.rating - a.rating;
    if (sortOrder === 'lowest') return a.rating - b.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="mt-8 border-t border-warm pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">Đánh giá khách hàng</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-muted">
                {avgRating.toFixed(1)} ({reviews.length} đánh giá)
              </span>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="mt-3 w-48 space-y-1">
              {starCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-muted">{star}</span>
                  <span className="text-yellow-400">★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-right text-muted">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {isLoggedInNow && !showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary cursor-pointer">
            Viết đánh giá
          </button>
        )}
        {!isLoggedInNow && (
          <a href={`${AUTH_URL}/login`} className="text-sm font-semibold text-indigo-600 hover:opacity-80 transition-opacity">
            Đăng nhập để đánh giá →
          </a>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-warm bg-warm-100 p-4">
          <p className="mb-2 text-sm font-bold text-stone-700">Đánh giá của bạn</p>
          <Stars rating={rating} interactive onSelect={setRating} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhận xét của bạn (tùy chọn)..."
            rows={3}
            className="mt-3 w-full resize-none rounded-xl border border-warm px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="cursor-pointer rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-warm-100 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {reviews.length > 1 && (
        <div className="mb-3 flex justify-end">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="cursor-pointer rounded-lg border border-warm px-3 py-1.5 text-xs text-stone-600 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
          </select>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review: ReviewInfo) => (
            <div key={review.id} className="card p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-stone-900">{review.userName}</span>
                  {review.verifiedPurchase && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Đã mua
                    </span>
                  )}
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.content && (
                <p className="text-sm text-stone-600">{review.content}</p>
              )}
              <p className="mt-2 text-xs text-muted">
                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  slug: string;
  initialProduct: ProductDetail;
}

export function ProductDetailClient({ slug, initialProduct }: Props) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [failedImageIds, setFailedImageIds] = useState<Set<string>>(() => new Set());
  const [addingToCart, setAddingToCart] = useState(false);
  const [qty, setQty] = useState(1);
  const addToCartBtnRef = useRef<HTMLButtonElement>(null);
  const sizeGuideRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug),
    initialData: initialProduct,
    staleTime: 60_000,
  });

  const { data: wishlistIds = [] } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: typeof window !== 'undefined' && isLoggedIn(),
  });
  const isWishlisted = new Set(wishlistIds).has(product?.id ?? '');

  const toggleWishlistMutation = useMutation({
    mutationFn: () =>
      isWishlisted ? removeFromWishlist(product!.id) : addToWishlist(product!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  function handleToggleWishlist() {
    if (!isLoggedIn()) {
      window.location.href = `${AUTH_URL}/login`;
      return;
    }
    const wasWishlisted = isWishlisted;
    toggleWishlistMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(wasWishlisted ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích ♥');
      },
      onError: (err) => {
        toast.error((err as Error).message || 'Có lỗi xảy ra, vui lòng thử lại');
      },
    });
  }

  const variants = product?.variants ?? [];
  const defaultVariant = useMemo(
    () => variants.find((variant) => variant.isDefault) ?? variants[0] ?? null,
    [variants],
  );
  const attributeOptions = useMemo(() => {
    const options = new Map<string, string[]>();

    for (const variant of variants) {
      for (const [key, value] of Object.entries(variant.attributes ?? {})) {
        if (!value) continue;
        const values = options.get(key) ?? [];
        if (!values.includes(value)) values.push(value);
        options.set(key, values);
      }
    }

    return Array.from(options.entries()).map(([key, values]) => ({ key, values }));
  }, [variants]);
  const attributeKeys = attributeOptions.map(({ key }) => key);
  const hasSizeGuide = attributeKeys.some((key) => key.toLowerCase() === 'size');

  useEffect(() => {
    if (!defaultVariant || Object.keys(selectedAttributes).length > 0) return;

    setSelectedAttributes(defaultVariant.attributes ?? {});
    setSelectedVariantId(defaultVariant.id);
  }, [defaultVariant, selectedAttributes]);

  const selectedVariant = useMemo(() => {
    const fullySelected = attributeKeys.every((key) => Boolean(selectedAttributes[key]));
    const attributeMatch = variants.find((variant) =>
      attributeKeys.every((key) => !selectedAttributes[key] || variant.attributes?.[key] === selectedAttributes[key]),
    );

    if (fullySelected && attributeMatch) return attributeMatch;
    return variants.find((variant) => variant.id === selectedVariantId) ?? attributeMatch ?? defaultVariant;
  }, [attributeKeys, defaultVariant, selectedAttributes, selectedVariantId, variants]);

  const effectivePriceVnd = selectedVariant?.priceVnd ?? product?.priceVnd ?? 0;
  const effectiveStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const effectiveSku = selectedVariant?.sku ?? product?.sku;
  const likeCount = product ? Math.max(24, product.reviewCount * 7 + Math.round(product.averageRating * 9)) : 0;

  function handleAttributeSelect(key: string, value: string) {
    const nextAttributes = { ...selectedAttributes, [key]: value };
    const nextVariant = variants.find((variant) =>
      attributeKeys.every((attrKey) => !nextAttributes[attrKey] || variant.attributes?.[attrKey] === nextAttributes[attrKey]),
    );

    setSelectedAttributes(nextAttributes);
    setSelectedVariantId(nextVariant?.id ?? null);
    setQty(1);
  }

  function isAttributeValueAvailable(key: string, value: string) {
    const nextAttributes = { ...selectedAttributes, [key]: value };

    return variants.some((variant) =>
      variant.stock > 0 &&
      attributeKeys.every((attrKey) => !nextAttributes[attrKey] || variant.attributes?.[attrKey] === nextAttributes[attrKey]),
    );
  }

  function scrollToSizeGuide() {
    sizeGuideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleShare(channel: 'copy' | 'facebook' | 'messenger') {
    const url = window.location.href;
    const encodedUrl = encodeURIComponent(url);

    if (channel === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (channel === 'messenger') {
      window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}`, '_blank', 'noopener,noreferrer');
      return;
    }

    await navigator.clipboard.writeText(url);
    toast.success('Da sao chep lien ket san pham');
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="aspect-square w-full animate-pulse rounded-xl bg-stone-100" />
          <div className="space-y-4">
            <div className="h-4 w-24 rounded bg-stone-100 animate-pulse" />
            <div className="h-8 w-3/4 rounded bg-stone-100 animate-pulse" />
            <div className="h-10 w-32 rounded bg-stone-100 animate-pulse" />
            <div className="h-4 w-48 rounded bg-stone-100 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="font-bold text-stone-700">Không tìm thấy sản phẩm.</p>
        <Link href="/products" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:opacity-80 transition-opacity">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  async function handleAddToCart() {
    if (!product) return;
    setAddingToCart(true);
    try {
      await addToCart(product.id, qty, selectedVariant?.id);
      if (addToCartBtnRef.current) {
        flyToCart(addToCartBtnRef.current.getBoundingClientRect());
      }
      toast.success(`Đã thêm ${qty > 1 ? `${qty}x ` : ''}"${product.name}" vào giỏ hàng!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Có lỗi xảy ra khi thêm vào giỏ hàng');
    } finally {
      setAddingToCart(false);
    }
  }

  const images = product.images.length > 0
    ? product.images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    : null;
  const currentImage = images?.[selectedImageIndex];
  const availableCurrentImage = currentImage && !failedImageIds.has(currentImage.id) ? currentImage : null;

  function markImageFailed(id: string) {
    setFailedImageIds((previous) => new Set(previous).add(id));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted">
        <Link href="/" className="hover:text-indigo-600 transition-colors">Trang chủ</Link>
        <span className="text-stone-300">/</span>
        <Link href="/products" className="hover:text-indigo-600 transition-colors">Sản phẩm</Link>
        <span className="text-stone-300">/</span>
        <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-indigo-600 transition-colors">
          {product.category.name}
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-800 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-stone-100">
            {availableCurrentImage ? (
              <Image
                src={availableCurrentImage.url}
                alt={availableCurrentImage.alt ?? product.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-[1.35] cursor-zoom-in"
                priority
                onError={() => markImageFailed(availableCurrentImage.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted">
                Chưa có ảnh
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 transition-all ${
                    i === selectedImageIndex
                      ? 'border-indigo-500 shadow-brand'
                      : 'border-warm hover:border-indigo-300'
                  }`}
                >
                  {!failedImageIds.has(img.id) ? (
                    <Image
                      src={img.url}
                      alt={img.alt ?? ''}
                      fill
                      className="object-cover"
                      onError={() => markImageFailed(img.id)}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-stone-100 text-[10px] font-semibold text-muted">
                      No image
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warm bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <span className="text-lg text-red-500">♥</span>
              {likeCount.toLocaleString('vi-VN')} luot thich
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Chia se</span>
              <button
                type="button"
                onClick={() => handleShare('facebook')}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() => handleShare('messenger')}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Messenger
              </button>
              <button
                type="button"
                onClick={() => handleShare('copy')}
                className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-bold text-stone-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                Copy link
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-semibold text-indigo-600">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-black text-stone-900 tracking-tight">{product.name}</h1>
          {effectiveSku && (
            <p className="mt-1 text-xs text-muted">SKU: <span className="font-mono">{effectiveSku}</span></p>
          )}

          {product.averageRating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-yellow-400">
                {'★'.repeat(Math.round(product.averageRating))}
                {'☆'.repeat(5 - Math.round(product.averageRating))}
              </div>
              <span className="text-sm text-muted">{product.averageRating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-600">{formatVND(effectivePriceVnd)}</span>
          </div>

          <div className="mt-2">
            {effectiveStock > 0 ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Còn hàng ({effectiveStock} sản phẩm)
              </span>
            ) : (
              <span className="text-sm font-medium text-red-600">Hết hàng</span>
            )}
          </div>

          {effectiveStock > 0 && effectiveStock <= 10 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              ⚠️ Chỉ còn {effectiveStock} sản phẩm
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map(({ tag }) => (
                <span key={tag.name} className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {attributeOptions.length > 0 && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-stone-700">Tuy chon san pham</p>
                {selectedVariant && (
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-600">
                    {getVariantLabel(selectedVariant)}
                  </span>
                )}
              </div>

              {attributeOptions.map(({ key, values }) => (
                <div key={key} className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-wide text-muted">{formatAttributeLabel(key)}</p>
                  <div className="flex flex-wrap gap-2">
                    {values.map((value) => {
                      const isSelected = selectedAttributes[key] === value;
                      const isAvailable = isAttributeValueAvailable(key, value);

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => handleAttributeSelect(key, value)}
                          disabled={!isAvailable}
                          className={`min-w-14 rounded-xl border px-4 py-2 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                            isSelected
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                              : 'border-warm bg-white text-stone-700 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!selectedVariant && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                  Tuy chon nay hien chua co san. Hay chon to hop khac.
                </p>
              )}

              {hasSizeGuide && (
                <button
                  type="button"
                  onClick={scrollToSizeGuide}
                  className="text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
                >
                  Huong dan chon size
                </button>
              )}
            </div>
          )}

          {effectiveStock > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm font-semibold text-stone-700">Số lượng:</span>
              <div className="flex items-center rounded-xl border border-warm overflow-hidden">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-lg font-bold text-stone-600 hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.min(effectiveStock, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-12 border-x border-warm py-2 text-center text-sm font-bold focus:outline-none bg-white"
                  min={1}
                  max={effectiveStock}
                />
                <button
                  onClick={() => setQty((q) => Math.min(effectiveStock, q + 1))}
                  disabled={qty >= effectiveStock}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center text-lg font-bold text-stone-600 hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              ref={addToCartBtnRef}
              disabled={effectiveStock === 0 || addingToCart}
              onClick={handleAddToCart}
              className="btn-primary flex-1 cursor-pointer py-3 text-base disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none"
            >
              {addingToCart
                ? 'Đang thêm...'
                : effectiveStock > 0
                ? '🛒 Thêm vào giỏ hàng'
                : 'Hết hàng'}
            </button>
            <button
              onClick={handleToggleWishlist}
              disabled={toggleWishlistMutation.isPending}
              className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isWishlisted
                  ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                  : 'border-warm bg-white text-stone-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              {isWishlisted ? '♥ Đã lưu' : '♡ Lưu'}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-warm bg-white p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-muted">Shop</p>
                <h2 className="mt-1 text-base font-black text-stone-900">Lishop Official Store</h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                Mall verified
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">98%</p>
                <p className="text-xs text-muted">Phan hoi</p>
              </div>
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">24h</p>
                <p className="text-xs text-muted">Xu ly don</p>
              </div>
              <div className="rounded-lg bg-warm-100 px-3 py-2">
                <p className="text-sm font-black text-stone-900">4.9</p>
                <p className="text-xs text-muted">Danh gia</p>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-warm pt-6">
            <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">Chi tiet san pham</h2>
            <div className="mt-4 space-y-5 text-sm leading-relaxed text-stone-600">
              <section>
                <h3 className="font-black uppercase tracking-wide text-stone-800">Ten san pham</h3>
                <p className="mt-1">{product.name}</p>
              </section>

              <section>
                <h3 className="font-black uppercase tracking-wide text-stone-800">Thong tin san pham</h3>
                <p className="mt-1 whitespace-pre-line">{product.description}</p>
                <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-warm-100 px-3 py-2">
                    <dt className="text-xs font-bold text-muted">Danh muc</dt>
                    <dd className="font-semibold text-stone-800">{product.category.name}</dd>
                  </div>
                  <div className="rounded-lg bg-warm-100 px-3 py-2">
                    <dt className="text-xs font-bold text-muted">SKU hien tai</dt>
                    <dd className="font-mono text-xs font-semibold text-stone-800">{effectiveSku ?? 'Dang cap nhat'}</dd>
                  </div>
                </dl>
              </section>

              {hasSizeGuide && (
                <section ref={sizeGuideRef} id="size-guide" className="scroll-mt-24">
                  <h3 className="font-black uppercase tracking-wide text-stone-800">Huong dan size</h3>
                  <p className="mt-1">
                    Neu ban phan van giua hai size, hay chon size lon hon de thoai mai hon. Vui long doi chieu
                    thong so co the voi bang size cua tung mau san pham truoc khi dat hang.
                  </p>
                </section>
              )}

              <section>
                <h3 className="font-black uppercase tracking-wide text-stone-800">Huong dan bao quan</h3>
                <p className="mt-1">
                  Bao quan san pham noi kho thoang, tranh anh nang truc tiep va nhiet do cao. Voi thoi trang,
                  nen giat mat trai va tach mau; voi thiet bi, tranh am va sac bang phu kien phu hop.
                </p>
              </section>

              <section>
                <h3 className="font-black uppercase tracking-wide text-stone-800">Cam ket khach hang</h3>
                <ul className="mt-2 space-y-1">
                  <li>San pham dung mo ta va duoc kiem tra truoc khi giao.</li>
                  <li>Ho tro doi tra theo chinh sach Lishop neu san pham loi hoac sai phien ban.</li>
                  <li>Tu van nhanh qua chat va cap nhat trang thai don hang lien tuc.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      </div>

      <ReviewsSection productId={product.id} />
      <RelatedProducts slug={slug} />
      <ChatWidget />
    </div>
  );
}
