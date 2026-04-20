'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { formatVND } from '@lishop/shared';
import { catalogApi, ReviewInfo } from '../../../lib/catalog-api';
import { RelatedProducts } from '../../../components/related-products';
import { addToCart } from '../../../lib/cart-helper';
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../../../lib/wishlist-api';

function Stars({ rating, interactive = false, onSelect }: { rating: number; interactive?: boolean; onSelect?: (r: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          onClick={() => interactive && onSelect?.(s)}
          className={`${s <= rating ? 'text-yellow-400' : 'text-gray-300'} ${interactive ? 'cursor-pointer text-2xl' : 'text-base'}`}
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('lishop_at') : null;

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
    <div className="mt-8 border-t pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Đánh giá khách hàng</h2>
          {reviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-gray-500">
                {avgRating.toFixed(1)} ({reviews.length} đánh giá)
              </span>
            </div>
          )}
          {reviews.length > 0 && (
            <div className="mt-3 w-48 space-y-1">
              {starCounts.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-gray-500">{star}</span>
                  <span className="text-yellow-400">★</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-right text-gray-400">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {token && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Viết đánh giá
          </button>
        )}
        {!token && (
          <a href="http://localhost:3001/login" className="text-sm text-indigo-600 hover:underline">
            Đăng nhập để đánh giá
          </a>
        )}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Đánh giá của bạn</p>
          <Stars rating={rating} interactive onSelect={setRating} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhận xét của bạn (tùy chọn)..."
            rows={3}
            className="mt-3 w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitMutation.isPending ? 'Đang gửi...' : 'Gửi đánh giá'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
          {submitMutation.isError && (
            <p className="mt-2 text-xs text-red-600">
              {(submitMutation.error as Error).message}
            </p>
          )}
        </div>
      )}

      {reviews.length > 1 && (
        <div className="mb-3 flex justify-end">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
            className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 focus:outline-none"
          >
            <option value="newest">Mới nhất</option>
            <option value="highest">Đánh giá cao nhất</option>
            <option value="lowest">Đánh giá thấp nhất</option>
          </select>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400">Chưa có đánh giá nào.</p>
      ) : (
        <div className="space-y-4">
          {sortedReviews.map((review: ReviewInfo) => (
            <div key={review.id} className="rounded-xl border border-gray-100 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{review.userName}</span>
                  {review.verifiedPurchase && (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">
                      Đã mua
                    </span>
                  )}
                </div>
                <Stars rating={review.rating} />
              </div>
              {review.content && (
                <p className="text-sm text-gray-600">{review.content}</p>
              )}
              <p className="mt-2 text-xs text-gray-400">
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
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { slug } = use(params);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  const [qty, setQty] = useState(1);

  const queryClient = useQueryClient();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => catalogApi.getProduct(slug),
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
      window.location.href = 'http://localhost:3001/login';
      return;
    }
    toggleWishlistMutation.mutate();
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-gray-400">
        Đang tải...
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-red-600">Không tìm thấy sản phẩm.</p>
        <Link href="/products" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  async function handleAddToCart() {
    if (!product) return;
    setAddingToCart(true);
    setCartMessage('');
    try {
      await addToCart(product.id, qty);
      setCartMessage('Đã thêm vào giỏ hàng!');
      setTimeout(() => setCartMessage(''), 3000);
    } catch (err: unknown) {
      setCartMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setAddingToCart(false);
    }
  }

  const images = product.images.length > 0
    ? product.images.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    : null;
  const currentImage = images?.[selectedImageIndex];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-indigo-600">Trang chủ</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-indigo-600">Sản phẩm</Link>
        <span>/</span>
        <Link href={`/products?categoryId=${product.category.id}`} className="hover:text-indigo-600">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-gray-800">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Images */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt ?? product.name}
                fill
                className="object-cover transition-transform duration-300 hover:scale-[1.35] cursor-zoom-in"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-400">
                Chưa có ảnh
              </div>
            )}
          </div>
          {images && images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-colors ${
                    i === selectedImageIndex ? 'border-indigo-500' : 'border-gray-200'
                  }`}
                >
                  <Image src={img.url} alt={img.alt ?? ''} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm text-indigo-600">{product.category.name}</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{product.name}</h1>

          {product.averageRating > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-yellow-400">
                {'★'.repeat(Math.round(product.averageRating))}
                {'☆'.repeat(5 - Math.round(product.averageRating))}
              </div>
              <span className="text-sm text-gray-500">{product.averageRating.toFixed(1)} ({product.reviewCount} đánh giá)</span>
            </div>
          )}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-600">{formatVND(product.priceVnd)}</span>
          </div>

          <div className="mt-2">
            {product.stock > 0 ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Còn hàng ({product.stock} sản phẩm)
              </span>
            ) : (
              <span className="text-sm text-red-600">Hết hàng</span>
            )}
          </div>

          {product.stock > 0 && product.stock <= 10 && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              ⚠️ Chỉ còn {product.stock} sản phẩm
            </div>
          )}

          {product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map(({ tag }) => (
                <span key={tag.name} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {product.stock > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Số lượng:</span>
              <div className="flex items-center rounded-md border border-gray-300">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) =>
                    setQty(Math.min(product.stock, Math.max(1, parseInt(e.target.value) || 1)))
                  }
                  className="w-12 border-x border-gray-300 py-1.5 text-center text-sm font-semibold focus:outline-none"
                  min={1}
                  max={product.stock}
                />
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="flex h-9 w-9 items-center justify-center text-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="mt-4 flex gap-3">
              <button
                disabled={product.stock === 0 || addingToCart}
                onClick={handleAddToCart}
                className="flex-1 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingToCart ? 'Đang thêm...' : product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
              </button>
              <button
                onClick={handleToggleWishlist}
                disabled={toggleWishlistMutation.isPending}
                className={`rounded-md border px-4 py-3 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  isWishlisted
                    ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {isWishlisted ? '♥ Đã lưu' : '♡ Lưu'}
              </button>
            </div>
            {cartMessage && (
              <p className={`mt-2 text-sm text-center ${cartMessage.includes('Đã') ? 'text-green-600' : 'text-red-600'}`}>
                {cartMessage}
              </p>
            )}
          </div>

          <div className="mt-6 border-t pt-6">
            <h2 className="text-sm font-semibold text-gray-900">Mô tả sản phẩm</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>
      <ReviewsSection productId={product.id} />
      <RelatedProducts slug={slug} />
    </div>
  );
}
