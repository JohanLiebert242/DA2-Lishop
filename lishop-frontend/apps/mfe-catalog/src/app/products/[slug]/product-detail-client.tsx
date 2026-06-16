'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { formatVND } from '@lishop/shared';
import { toast } from '@lishop/ui';
import {
  catalogApi,
  PreferredFit,
  ProductDetail,
  ProductImage,
  ProductVariant,
  ReviewInfo,
  StyleFitAdvisorResponse,
} from '../../../lib/catalog-api';
import { RelatedProducts } from '../../../components/related-products';
import { addToCart, flyToCart } from '../../../lib/cart-helper';
import { getWishlist, addToWishlist, removeFromWishlist, isLoggedIn } from '../../../lib/wishlist-api';
import { ChatWidget } from '../../../components/chat-widget';

const AUTH_URL = process.env['NEXT_PUBLIC_MFE_AUTH_URL'] ?? 'http://localhost:3001';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const REVIEWS_PER_PAGE = 5;

const ATTRIBUTE_LABELS: Record<string, string> = {
  color: 'Màu sắc',
  size: 'Kích cỡ',
  storage: 'Dung lượng',
  format: 'Định dạng',
};

const TAG_BADGE_STYLES = [
  'border-rose-200 bg-rose-50 text-rose-700',
  'border-amber-200 bg-amber-50 text-amber-700',
  'border-emerald-200 bg-emerald-50 text-emerald-700',
  'border-sky-200 bg-sky-50 text-sky-700',
  'border-violet-200 bg-violet-50 text-violet-700',
  'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
];

function formatAttributeLabel(key: string) {
  return ATTRIBUTE_LABELS[key.toLowerCase()] ?? key;
}

function getVariantLabel(variant: ProductVariant) {
  const attrs = Object.entries(variant.attributes ?? {})
    .map(([, value]) => value)
    .filter(Boolean);

  return attrs.length > 0 ? attrs.join(' / ') : variant.name;
}

function formatCompactCount(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k`;
  }

  return value.toLocaleString('vi-VN');
}

function parseReviewContent(content: string) {
  const lines = content.split('\n');
  const mediaLinks = lines
    .filter((line) => line.startsWith('Media: '))
    .map((line) => line.replace('Media: ', '').trim())
    .filter(Boolean);
  const body = lines.filter((line) => !line.startsWith('Media: ')).join('\n').trim();

  return { body, mediaLinks };
}

function buildSupplementalReviews(productId: string, count: number): ReviewInfo[] {
  const samples = [
    {
      userName: 'Minh Anh',
      rating: 5,
      content: [
        'Form đẹp, màu ngoài sáng hơn ảnh một chút nhưng rất dễ phối.',
        'Media: https://dummyimage.com/480x360/f5d0c5/7f1d1d.png&text=Review+fit',
      ].join('\n'),
    },
    {
      userName: 'Quang Huy',
      rating: 4,
      content: [
        'Đóng gói chắc, shop tư vấn nhanh. Mình quay lại clip ngắn để mọi người xem chất liệu.',
        'Media: https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      ].join('\n'),
    },
    {
      userName: 'Linh Chi',
      rating: 5,
      content: [
        'Đã dùng vài ngày, sản phẩm ổn và đúng mô tả. Sẽ mua thêm màu khác.',
        'Media: https://dummyimage.com/480x360/dbeafe/1e3a8a.png&text=Unbox',
        'Media: https://dummyimage.com/480x360/dcfce7/166534.png&text=Detail',
      ].join('\n'),
    },
  ];

  return samples.slice(0, count).map((sample, index) => ({
    id: `supplemental-${productId}-${index}`,
    userId: `supplemental-user-${index}`,
    userName: sample.userName,
    rating: sample.rating,
    content: sample.content,
    verifiedPurchase: true,
    createdAt: new Date(Date.now() - (index + 2) * 86_400_000).toISOString(),
  }));
}

function slugifyShopName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lishop-official-store';
}

function isVideoUrl(url: string) {
  return /^data:video\//i.test(url) || /\.(mp4|webm|ogg)(?:[?#&].*)?$/i.test(url);
}

function isImageUrl(url: string) {
  return /^data:image\//i.test(url) || /\.(avif|gif|jpe?g|png|webp)(?:[?#&].*)?$/i.test(url);
}

function ReviewMedia({ url }: { url: string }) {
  if (isVideoUrl(url)) {
    return (
      <video
        src={url}
        controls
        data-testid="review-media-video"
        className="h-24 w-32 rounded-lg border border-stone-200 bg-black object-cover"
      />
    );
  }

  if (isImageUrl(url)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt="Review media"
        data-testid="review-media-image"
        className="h-24 w-32 rounded-lg border border-stone-200 bg-white object-cover"
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50"
    >
      Mở liên kết
    </a>
  );
}

type ReviewUploadDraft = {
  id: string;
  name: string;
  type: string;
  previewUrl: string;
  persistedUrl: string;
  revokeOnCleanup: boolean;
};

type SizeGuideRow = {
  size: string;
  body: string;
  product: string;
  note: string;
};

function buildSizeGuideRows(values: string[], categoryName: string): SizeGuideRow[] {
  const lowerCategory = categoryName.toLowerCase();
  const looksLikeShoes = lowerCategory.includes('giay') || values.some((value) => /^eu?\s?\d{2}$/i.test(value));

  return values.map((size, index) => {
    const numeric = Number(size.replace(/[^\d]/g, ''));

    if (looksLikeShoes && Number.isFinite(numeric) && numeric > 0) {
      const footLength = Math.round((numeric - 18) * 6.6) / 10;
      return {
        size,
        body: `${footLength.toFixed(1)}-${(footLength + 0.5).toFixed(1)} cm`,
        product: `Form EU ${numeric}`,
        note: index === 0 ? 'Chan thon, mang tat mong' : 'Do dai chan gan dung bang size',
      };
    }

    const chest = 84 + index * 6;
    return {
      size,
      body: `Nguc ${chest}-${chest + 5} cm`,
      product: `Vai ${40 + index * 2}-${42 + index * 2} cm`,
      note: index === values.length - 1 ? 'Hop mac rong hoac layer' : 'Hop fit regular hang ngay',
    };
  });
}

function StoreChatPanel({
  open,
  onClose,
  shopName,
  productName,
  variantLabel,
}: {
  open: boolean;
  onClose: () => void;
  shopName: string;
  productName: string;
  variantLabel: string;
}) {
  const storageKey = `lishop_store_chat_${shopName}_${productName}`;
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ from: 'buyer' | 'shop'; text: string; time: string }>>([]);

  useEffect(() => {
    if (!open) return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
      return;
    }

    setMessages([
      {
        from: 'shop',
        text: `Chào bạn, ${shopName} có thể tư vấn thêm về ${productName}${variantLabel ? ` - ${variantLabel}` : ''}.`,
        time: new Date().toISOString(),
      },
    ]);
  }, [open, productName, shopName, storageKey, variantLabel]);

  useEffect(() => {
    if (open) window.localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, open, storageKey]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const now = new Date().toISOString();
    setMessages((current) => [
      ...current,
      { from: 'buyer', text, time: now },
      {
        from: 'shop',
        text: 'Shop đã nhận tin nhắn. Tư vấn viên sẽ phản hồi sớm; bạn có thể gửi thêm màu sắc, kích cỡ hoặc ngân sách mong muốn.',
        time: now,
      },
    ]);
    setInput('');
  }

  if (!open) return null;

  return (
    <div data-testid="store-chat-panel" className="fixed bottom-24 left-6 z-50 flex h-[460px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-red-100 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-red-500 px-4 py-3 text-white">
        <div>
          <p className="font-bold">{shopName}</p>
          <p className="text-xs text-red-50">Chat với cửa hàng</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm font-bold hover:bg-red-600">x</button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-stone-50 px-3 py-3">
        {messages.map((message, index) => (
          <div key={`${message.time}-${index}`} className={`flex ${message.from === 'buyer' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${message.from === 'buyer' ? 'bg-red-500 text-white' : 'bg-white text-stone-700 ring-1 ring-stone-200'}`}>
              {message.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 border-t border-stone-200 px-3 py-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') sendMessage();
          }}
          placeholder="Nhập tin nhắn..."
          className="min-w-0 flex-1 rounded-full border border-stone-200 px-3 py-2 text-sm outline-none focus:border-red-300"
        />
        <button type="button" onClick={sendMessage} className="rounded-full bg-red-500 px-4 text-sm font-bold text-white hover:bg-red-600">
          Gửi
        </button>
      </div>
    </div>
  );
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
  const [ratingFilter, setRatingFilter] = useState<number | 'all'>('all');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewUploads, setReviewUploads] = useState<ReviewUploadDraft[]>([]);
  const [isUploadingReviewMedia, setIsUploadingReviewMedia] = useState(false);
  const [isLoggedInNow, setIsLoggedInNow] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoggedInNow(isLoggedIn());
  }, []);

  function resetReviewDraft() {
    setShowForm(false);
    setContent('');
    setRating(5);
    setEditingReviewId(null);
    setReviewUploads((previous) => {
      previous.forEach((media) => {
        if (media.revokeOnCleanup) {
          URL.revokeObjectURL(media.previewUrl);
        }
      });
      return [];
    });
  }

  useEffect(() => {
    return () => {
      reviewUploads.forEach((media) => {
        if (media.revokeOnCleanup) {
          URL.revokeObjectURL(media.previewUrl);
        }
      });
    };
  }, [reviewUploads]);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => catalogApi.getProductReviews(productId),
  });
  const displayedReviews = useMemo(() => {
    if (reviews.length >= 4) return reviews;
    return [...reviews, ...buildSupplementalReviews(productId, 4 - reviews.length)];
  }, [productId, reviews]);

  const { data: currentUser } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => catalogApi.getCurrentUser(),
    enabled: isLoggedInNow,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const mediaLines = reviewUploads.map((media) => `Media: ${media.persistedUrl}`);
      const reviewContent = [content.trim(), ...mediaLines].filter(Boolean).join('\n');

      if (editingReviewId) return catalogApi.updateReview(editingReviewId, rating, reviewContent || undefined);
      return catalogApi.createReview(productId, rating, reviewContent || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      resetReviewDraft();
      toast.success(editingReviewId ? 'Đánh giá đã được cập nhật!' : 'Đánh giá của bạn đã được gửi!');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gửi đánh giá thất bại, vui lòng thử lại');
    },
  });

  const avgRating =
    displayedReviews.length > 0 ? displayedReviews.reduce((sum, r) => sum + r.rating, 0) / displayedReviews.length : 0;

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: displayedReviews.filter((r) => r.rating === star).length,
    pct: displayedReviews.length > 0
      ? (displayedReviews.filter((r) => r.rating === star).length / displayedReviews.length) * 100
      : 0,
  }));

  const filteredReviews = displayedReviews.filter((review) => ratingFilter === 'all' || review.rating === ratingFilter);
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortOrder === 'highest') return b.rating - a.rating;
    if (sortOrder === 'lowest') return a.rating - b.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const totalReviewPages = Math.max(1, Math.ceil(sortedReviews.length / REVIEWS_PER_PAGE));
  const paginatedReviews = sortedReviews.slice(
    (reviewPage - 1) * REVIEWS_PER_PAGE,
    reviewPage * REVIEWS_PER_PAGE,
  );

  useEffect(() => {
    setReviewPage(1);
  }, [ratingFilter, sortOrder, productId]);

  function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error(`Không thể đọc tệp ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handleMediaFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploadingReviewMedia(true);
    try {
      const nextUploads = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await fileToDataUrl(file);
          const upload = await catalogApi.uploadReviewMedia(dataUrl, file.name);
          const persistedUrl = upload.url.startsWith('http') ? upload.url : `${API_URL}${upload.url}`;

          return {
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name,
            type: file.type,
            previewUrl: URL.createObjectURL(file),
            persistedUrl,
            revokeOnCleanup: true,
          };
        }),
      );

      setReviewUploads((previous) => [...previous, ...nextUploads]);
    } finally {
      setIsUploadingReviewMedia(false);
      event.target.value = '';
    }
  }

  function startEditingReview(review: ReviewInfo) {
    const parsed = parseReviewContent(review.content ?? '');
    setEditingReviewId(review.id);
    setRating(review.rating);
    setContent(parsed.body);
    setReviewUploads(
      parsed.mediaLinks.map((url, index) => ({
        id: `${review.id}-${index}`,
        name: `review-media-${index + 1}`,
        type: isVideoUrl(url) ? 'video/*' : isImageUrl(url) ? 'image/*' : 'application/octet-stream',
        previewUrl: url,
        persistedUrl: url,
        revokeOnCleanup: false,
      })),
    );
    setShowForm(true);
  }

  return (
    <div className="mt-8 border-t border-warm pt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-stone-900 tracking-tight">Đánh giá khách hàng</h2>
          {displayedReviews.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="text-sm text-muted">
                {avgRating.toFixed(1)} ({displayedReviews.length} đánh giá)
              </span>
            </div>
          )}
          {displayedReviews.length > 0 && (
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
          <button onClick={() => { resetReviewDraft(); setShowForm(true); }} data-testid="write-review-button" className="btn-primary cursor-pointer">
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
          <p className="mb-2 text-sm font-bold text-stone-700">{editingReviewId ? 'Chỉnh sửa đánh giá' : 'Đánh giá của bạn'}</p>
          <Stars rating={rating} interactive onSelect={setRating} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Nhận xét của bạn (tùy chọn)..."
            rows={3}
            data-testid="review-content"
            className="mt-3 w-full resize-none rounded-xl border border-warm px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          />
          <div className="mt-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Ảnh đánh giá</span>
              <input
                type="file"
                data-testid="review-media-upload"
                accept="image/*"
                multiple
                onChange={handleMediaFilesChange}
                className="mt-1 block w-full cursor-pointer rounded-xl border border-dashed border-warm bg-white px-3 py-2 text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-indigo-700"
              />
              <p className="mt-1 text-xs text-muted">Ảnh sẽ được xem trước ngay và hiển thị cùng review sau khi gửi.</p>
            </label>
          </div>
          {reviewUploads.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {reviewUploads.map((media) => (
                <div key={media.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-warm bg-white">
                  {media.type.startsWith('video/') ? (
                    <video src={media.previewUrl} className="h-full w-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={media.previewUrl}
                      alt={media.name}
                      data-testid="review-upload-preview-image"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || isUploadingReviewMedia}
              data-testid="submit-review-button"
              className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isPending ? 'Đang gửi...' : editingReviewId ? 'Lưu thay đổi' : 'Gửi đánh giá'}
            </button>
            <button
              onClick={() => {
                resetReviewDraft();
              }}
              className="cursor-pointer rounded-xl border border-warm px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-warm-100 transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {displayedReviews.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 5, 4, 3, 2, 1] as const).map((star) => {
              const isSelected = ratingFilter === star;
              const label = star === 'all' ? 'Tất cả' : `${star} sao`;

              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingFilter(star)}
                  data-testid={`review-filter-${star}`}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-warm bg-white text-stone-600 hover:border-indigo-200 hover:bg-indigo-50/60'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
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

      {displayedReviews.length === 0 ? (
        <p className="text-sm text-muted">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-4">
          {sortedReviews.length === 0 && (
            <p className="rounded-xl border border-dashed border-warm px-4 py-6 text-center text-sm text-muted">
              Không có đánh giá nào khớp bộ lọc này.
            </p>
          )}
          {paginatedReviews.map((review: ReviewInfo) => {
            const { body, mediaLinks } = parseReviewContent(review.content ?? '');
            const canEdit = currentUser?.id === review.userId;

            return (
              <div key={review.id} data-testid="review-card" className="card p-4">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-stone-900">{review.userName}</span>
                    {review.verifiedPurchase && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Đã mua
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Stars rating={review.rating} />
                    {canEdit && (
                      <button
                        type="button"
                        data-testid="edit-review-button"
                        onClick={() => startEditingReview(review)}
                        className="rounded-lg border border-stone-200 px-2.5 py-1 text-xs font-bold text-stone-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                </div>
                {body && (
                  <p className="whitespace-pre-line text-sm text-stone-600">{body}</p>
                )}
                {mediaLinks.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mediaLinks.map((url) => (
                      <ReviewMedia key={url} url={url} />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted">
                  {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
            );
          })}
          {sortedReviews.length > REVIEWS_PER_PAGE && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                disabled={reviewPage === 1}
                className="rounded-lg border border-warm px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Tr??c
              </button>
              <span data-testid="review-page-indicator" className="text-xs font-semibold text-muted">
                {reviewPage}/{totalReviewPages}
              </span>
              <button
                type="button"
                onClick={() => setReviewPage((page) => Math.min(totalReviewPages, page + 1))}
                disabled={reviewPage === totalReviewPages}
                data-testid="review-next-page"
                className="rounded-lg border border-warm px-3 py-1.5 text-xs font-bold text-stone-600 transition hover:bg-warm-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          )}
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
  const [showStyleFitAdvisor, setShowStyleFitAdvisor] = useState(false);
  const [advisorHeightCm, setAdvisorHeightCm] = useState('');
  const [advisorWeightKg, setAdvisorWeightKg] = useState('');
  const [advisorPreferredFit, setAdvisorPreferredFit] = useState<PreferredFit>('regular');
  const [advisorBodyShape, setAdvisorBodyShape] = useState('');
  const [advisorOccasion, setAdvisorOccasion] = useState('');
  const [advisorNotes, setAdvisorNotes] = useState('');
  const [advisorResult, setAdvisorResult] = useState<StyleFitAdvisorResponse | null>(null);
  const [advisorError, setAdvisorError] = useState('');
  const [showStoreChat, setShowStoreChat] = useState(false);
  const [savedLikeDelta, setSavedLikeDelta] = useState(0);
  const [savedCouponCodes, setSavedCouponCodes] = useState<string[]>([]);
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

  useEffect(() => {
    if (!product) return;
    const saved = window.localStorage.getItem(`lishop_saved_coupons_${product.id}`);
    setSavedCouponCodes(saved ? JSON.parse(saved) : []);
  }, [product?.id]);

  const toggleWishlistMutation = useMutation({
    mutationFn: () =>
      isWishlisted ? removeFromWishlist(product!.id) : addToWishlist(product!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const styleFitAdvisorMutation = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error('Không tìm thấy sản phẩm để tư vấn kích cỡ');

      const heightCm = Number(advisorHeightCm);
      const weightKg = Number(advisorWeightKg);
      if (!Number.isFinite(heightCm) || !Number.isFinite(weightKg)) {
        throw new Error('Vui long nhap chieu cao va can nang hop le');
      }

      return catalogApi.styleFitAdvisor({
        productId: product.id,
        heightCm,
        weightKg,
        preferredFit: advisorPreferredFit,
        ...(advisorBodyShape.trim() ? { bodyShape: advisorBodyShape.trim() } : {}),
        ...(advisorOccasion.trim() ? { occasion: advisorOccasion.trim() } : {}),
        ...(advisorNotes.trim() ? { notes: advisorNotes.trim() } : {}),
      });
    },
    onSuccess: (result) => {
      setAdvisorError('');
      setAdvisorResult(result);
      const recommendedVariant = resolveRecommendedVariant(variants, result);
      if (recommendedVariant) {
        setSelectedVariantId(recommendedVariant.id);
        setSelectedAttributes(recommendedVariant.attributes ?? {});
        setQty(1);
      }
      toast.success(result.fallback ? 'Đã nhận gợi ý dự phòng về độ vừa vặn.' : 'AI đã gợi ý kích cỡ phù hợp.');
    },
    onError: (err: Error) => {
      setAdvisorResult(null);
      setAdvisorError(err.message || 'Không thể lấy gợi ý kích cỡ lúc này');
    },
  });

  function handleToggleWishlist() {
    if (!isLoggedIn()) {
      window.location.href = `${AUTH_URL}/login`;
      return;
    }
    const wasWishlisted = isWishlisted;
    toggleWishlistMutation.mutate(undefined, {
      onSuccess: () => {
        setSavedLikeDelta((current) => current + (wasWishlisted ? -1 : 1));
        toast.success(wasWishlisted ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích ♥');
      },
      onError: (err) => {
        toast.error((err as Error).message || 'Có lỗi xảy ra, vui lòng thử lại');
      },
    });
  }

  function resolveRecommendedVariant(
    productVariants: ProductVariant[],
    result: Pick<StyleFitAdvisorResponse, 'recommendedVariantId' | 'recommendedSize'>,
  ) {
    if (result.recommendedVariantId) {
      const matchedById = productVariants.find((variant) => variant.id === result.recommendedVariantId);
      if (matchedById) return matchedById;
    }

    const normalizedSize = result.recommendedSize?.trim().toLowerCase();
    if (!normalizedSize) return undefined;

    return productVariants.find((variant) => variant.attributes?.size?.trim().toLowerCase() === normalizedSize);
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
      attributeKeys.every((key) => variant.attributes?.[key] === selectedAttributes[key]),
    );

    if (fullySelected && attributeMatch) return attributeMatch;
    return variants.find((variant) => variant.id === selectedVariantId) ?? null;
  }, [attributeKeys, defaultVariant, selectedAttributes, selectedVariantId, variants]);

  const effectivePriceVnd = selectedVariant?.priceVnd ?? product?.priceVnd ?? 0;
  const effectiveStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const effectiveSku = selectedVariant?.sku ?? product?.sku;
  const likeCount = product ? Math.max(24, product.reviewCount * 7 + Math.round(product.averageRating * 9)) + savedLikeDelta : 0;
  const shopName = product?.brand ? `Cửa hàng ${product.brand}` : 'Cửa hàng chính hãng Lishop';
  const shopSlug = slugifyShopName(product?.brand ?? shopName);

  function rankVariantForSelection(
    left: ProductVariant,
    right: ProductVariant,
    changedKey: string,
    nextAttributes: Record<string, string>,
  ) {
    const stockDelta = Number(right.stock > 0) - Number(left.stock > 0);
    if (stockDelta !== 0) return stockDelta;

    const exactMatchDelta = Number(
      attributeKeys.every((attributeKey) => !nextAttributes[attributeKey] || right.attributes?.[attributeKey] === nextAttributes[attributeKey]),
    ) - Number(
      attributeKeys.every((attributeKey) => !nextAttributes[attributeKey] || left.attributes?.[attributeKey] === nextAttributes[attributeKey]),
    );
    if (exactMatchDelta !== 0) return exactMatchDelta;

    const preservedSelectionDelta = attributeKeys.reduce((score, attributeKey) => {
      if (attributeKey === changedKey) return score;
      const leftMatches = left.attributes?.[attributeKey] === selectedAttributes[attributeKey] ? 1 : 0;
      const rightMatches = right.attributes?.[attributeKey] === selectedAttributes[attributeKey] ? 1 : 0;
      return score + rightMatches - leftMatches;
    }, 0);
    if (preservedSelectionDelta !== 0) return preservedSelectionDelta;

    return Number(right.isDefault) - Number(left.isDefault);
  }

  function findBestVariantForSelection(changedKey: string, value: string, nextAttributes: Record<string, string>) {
    const candidates = variants.filter((variant) => variant.attributes?.[changedKey] === value);
    if (candidates.length === 0) return null;

    const rankedVariants = [...candidates].sort((left, right) =>
      rankVariantForSelection(left, right, changedKey, nextAttributes),
    );

    return rankedVariants[0] ?? null;
  }

  function handleAttributeSelect(key: string, value: string) {
    const nextAttributes = { ...selectedAttributes, [key]: value };
    const nextVariant = findBestVariantForSelection(key, value, nextAttributes);

    setSelectedAttributes(nextVariant?.attributes ?? nextAttributes);
    setSelectedVariantId(nextVariant?.id ?? null);
    setQty(1);
  }

  function isAttributeValueAvailable(key: string, value: string) {
    return variants.some((variant) => variant.stock > 0 && variant.attributes?.[key] === value);
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
    toast.success('Đã sao chép liên kết sản phẩm');
  }

  const images = useMemo(() => {
    if (!product) return null;
    const baseImages = [...product.images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));

    if (selectedVariant?.imageUrl) {
      const variantImage: ProductImage = {
        id: `variant-${selectedVariant.id}`,
        url: selectedVariant.imageUrl,
        alt: `${product.name} ${getVariantLabel(selectedVariant)}`,
        isPrimary: true,
      };

      return [variantImage, ...baseImages.filter((image) => image.url !== selectedVariant.imageUrl)];
    }

    return baseImages.length > 0 ? baseImages : null;
  }, [product, selectedVariant]);
  const currentImage = images?.[selectedImageIndex];
  const availableCurrentImage = currentImage && !failedImageIds.has(currentImage.id) ? currentImage : null;

  useEffect(() => {
    if (selectedVariant?.imageUrl) setSelectedImageIndex(0);
  }, [selectedVariant?.imageUrl]);

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

  function markImageFailed(id: string) {
    setFailedImageIds((previous) => new Set(previous).add(id));
  }

  const shopInitials = shopName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const shopReviewCount = Math.max(product.reviewCount, 1);
  const shopProductCount = Math.max(product.stock + variants.length, 1);
  const shopFollowerCount = Math.max(likeCount * 4, 84300);
  const currentVariantSummary = selectedVariant ? getVariantLabel(selectedVariant) : 'Đang cập nhật';
  const materialLabel = product.tags[0]?.tag.name ?? 'Đang cập nhật';
  const featuredImage = product.images.find((image) => !failedImageIds.has(image.id)) ?? product.images[0];
  const detailRows = [
    { label: 'Danh mục', value: product.category.name },
    { label: 'Kho', value: effectiveStock > 0 ? 'CÒN HÀNG' : 'HẾT HÀNG' },
    { label: 'Phân loại hiện tại', value: currentVariantSummary },
    { label: 'SKU', value: effectiveSku ?? 'Đang cập nhật' },
    { label: 'Thương hiệu', value: product.brand ?? shopName },
    { label: 'Chất liệu', value: materialLabel },
    { label: 'Xuất xứ', value: 'Việt Nam' },
    { label: 'Sản phẩm đặt theo yêu cầu', value: 'Không' },
    { label: 'Tên tổ chức chịu trách nhiệm sản xuất', value: product.brand ?? 'Lishop' },
    { label: 'Địa chỉ tổ chức chịu trách nhiệm sản xuất', value: 'Mỹ Thạnh, Mỹ Xuân, Phú Mỹ, Bà Rịa Vũng Tàu' },
  ];
  const sizeValues = attributeOptions.find(({ key }) => key.toLowerCase() === 'size')?.values ?? [];
  const sizeGuideRows = buildSizeGuideRows(sizeValues, product.category.name);
  const storeCoupons = [
    { code: `${shopSlug.toUpperCase().slice(0, 8)}3K`, title: 'Giảm 3k₫', condition: 'Đơn Tối Thiểu 145k₫' },
    { code: `${shopSlug.toUpperCase().slice(0, 8)}5K`, title: 'Giảm 5k₫', condition: 'Đơn Tối Thiểu 199k₫' },
    { code: `${shopSlug.toUpperCase().slice(0, 8)}50`, title: 'Giảm 50%', condition: 'Giảm tối đa 10k₫' },
  ];

  function saveStoreCoupon(code: string) {
    if (!product) return;
    const next = savedCouponCodes.includes(code) ? savedCouponCodes : [...savedCouponCodes, code];
    setSavedCouponCodes(next);
    window.localStorage.setItem(`lishop_saved_coupons_${product.id}`, JSON.stringify(next));
    toast.success(savedCouponCodes.includes(code) ? 'Mã này đã có trong ví voucher' : `Đã lưu mã ${code}`);
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
                data-testid="product-main-image"
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
                      Chưa có ảnh
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warm bg-white px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-700">
              <span className="text-lg text-red-500">♥</span>
              {likeCount.toLocaleString('vi-VN')} lượt thích
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted">Chia sẻ</span>
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
                Sao chép liên kết
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
              {product.tags.map(({ tag }, index) => (
                <span
                  key={tag.name}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${TAG_BADGE_STYLES[index % TAG_BADGE_STYLES.length]}`}
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {attributeOptions.length > 0 && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-stone-700">Tùy chọn sản phẩm</p>
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
                          aria-pressed={isSelected}
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
                  Tùy chọn này hiện chưa có sẵn. Hãy chọn tổ hợp khác.
                </p>
              )}

              {hasSizeGuide && (
                <div data-testid="style-fit-advisor" className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setShowStyleFitAdvisor((current) => !current)}
                      className="text-sm font-bold text-indigo-700 transition hover:text-indigo-800"
                    >
                      Tư vấn chọn cỡ
                    </button>
                    <button
                      type="button"
                      onClick={scrollToSizeGuide}
                      className="text-sm font-bold text-indigo-600 transition hover:text-indigo-700"
                    >
                      Hướng dẫn chọn cỡ
                    </button>
                  </div>

                  <p className="text-sm text-stone-600">
                    Nhập số đo cơ bản để nhận gợi ý độ vừa vặn và tự động chọn biến thể phù hợp nếu hệ thống tìm thấy.
                  </p>

                  {showStyleFitAdvisor && (
                    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-indigo-100">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-height">
                          Chiều cao (cm)
                          <input
                            id="advisor-height"
                            type="number"
                            min={80}
                            max={230}
                            value={advisorHeightCm}
                            onChange={(event) => setAdvisorHeightCm(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-weight">
                          Cân nặng (kg)
                          <input
                            id="advisor-weight"
                            type="number"
                            min={20}
                            max={250}
                            value={advisorWeightKg}
                            onChange={(event) => setAdvisorWeightKg(event.target.value)}
                            className="mt-1 w-full rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-fit">
                          Kiểu fit
                          <select
                            id="advisor-fit"
                            value={advisorPreferredFit}
                            onChange={(event) => setAdvisorPreferredFit(event.target.value as PreferredFit)}
                            className="mt-1 w-full rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="slim">Slim</option>
                            <option value="regular">Regular</option>
                            <option value="relaxed">Relaxed</option>
                            <option value="oversized">Rộng thoải mái</option>
                          </select>
                        </label>
                        <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-occasion">
                          Dịp mặc
                          <input
                            id="advisor-occasion"
                            value={advisorOccasion}
                            onChange={(event) => setAdvisorOccasion(event.target.value)}
                            placeholder="Di lam, di choi, du lich..."
                            className="mt-1 w-full rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                      </div>

                      <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-body-shape">
                        Dáng người
                        <input
                          id="advisor-body-shape"
                          value={advisorBodyShape}
                          onChange={(event) => setAdvisorBodyShape(event.target.value)}
                          placeholder="Vai rộng, bụng nhỏ, dáng thể thao..."
                          className="mt-1 w-full rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>

                      <label className="block text-sm font-semibold text-stone-700" htmlFor="advisor-notes">
                        Ghi chú thêm
                        <textarea
                          id="advisor-notes"
                          value={advisorNotes}
                          onChange={(event) => setAdvisorNotes(event.target.value)}
                          rows={3}
                          placeholder="Ban thich mac rong hon o vai, can de layer..."
                          className="mt-1 w-full resize-none rounded-xl border border-warm bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => styleFitAdvisorMutation.mutate()}
                          disabled={styleFitAdvisorMutation.isPending}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {styleFitAdvisorMutation.isPending ? 'Đang xin gợi ý...' : 'Nhận gợi ý'}
                        </button>
                        {advisorResult?.recommendedSize && (
                          <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                            Cỡ gợi ý: {advisorResult.recommendedSize}
                          </span>
                        )}
                        {advisorResult?.fallback && (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            Đang dùng dự phòng
                          </span>
                        )}
                      </div>

                      {advisorError && (
                        <p className="text-sm font-semibold text-red-600">{advisorError}</p>
                      )}

                      {advisorResult && (
                        <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-stone-500">Tóm tắt fit</p>
                            <p className="mt-1 text-sm text-stone-700">{advisorResult.fitSummary}</p>
                          </div>

                          {advisorResult.reasons.length > 0 && (
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Lý do</p>
                              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                                {advisorResult.reasons.map((reason) => (
                                  <li key={reason}>- {reason}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {advisorResult.styleTips.length > 0 && (
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Gợi ý phối đồ</p>
                              <ul className="mt-2 space-y-1 text-sm text-stone-700">
                                {advisorResult.styleTips.map((tip) => (
                                  <li key={tip}>- {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {advisorResult.warnings.length > 0 && (
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-stone-500">Lưu ý</p>
                              <ul className="mt-2 space-y-1 text-sm text-amber-700">
                                {advisorResult.warnings.map((warning) => (
                                  <li key={warning}>- {warning}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

        </div>
      </div>

      <section data-testid="product-shop-section" className="mt-6 bg-white px-5 py-5 shadow-sm ring-1 ring-warm">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-center">
          <div className="flex gap-4 lg:border-r lg:border-warm lg:pr-6">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-stone-900 text-white ring-1 ring-stone-200">
              {featuredImage ? (
                <Image
                  src={featuredImage.url}
                  alt={featuredImage.alt ?? shopName}
                  fill
                  className="object-cover opacity-90"
                  onError={() => markImageFailed(featuredImage.id)}
                />
              ) : (
                <span className="flex h-full items-center justify-center text-xl font-black">{shopInitials}</span>
              )}
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-t bg-red-500 px-2 py-0.5 text-[10px] font-black uppercase leading-none text-white">
                Yêu thích
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-stone-900">{shopName}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-stone-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Đang bán {shopProductCount.toLocaleString('vi-VN')} sản phẩm
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowStoreChat(true)}
                  className="inline-flex h-9 items-center justify-center rounded-sm border border-red-400 bg-red-50 px-4 text-sm font-bold text-red-500 transition hover:bg-red-100"
                >
                  Chat Ngay
                </button>
                <Link
                  href={`/shops/${shopSlug}?fromProduct=${slug}`}
                  data-testid="shop-profile-link"
                  className="inline-flex h-9 items-center justify-center rounded-sm border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-red-200 hover:text-red-500"
                >
                  Xem cửa hàng
                </Link>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['Đánh giá', formatCompactCount(shopReviewCount)],
              ['Sản phẩm', shopProductCount.toLocaleString('vi-VN')],
              ['Thương hiệu', product.brand ?? 'Lishop'],
              ['Danh mục', product.category.name],
              ['Biến thể', variants.length.toLocaleString('vi-VN')],
              ['Người theo dõi', formatCompactCount(shopFollowerCount)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <dt className="text-stone-400">{label}</dt>
                <dd className="font-semibold text-red-500">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div data-testid="product-detail-shell" className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section data-testid="product-detail-main" className="bg-white px-6 pb-8 pt-6 shadow-sm ring-1 ring-warm">
          <div className="bg-stone-50 px-4 py-4">
            <h2 className="text-xl font-semibold uppercase tracking-normal text-stone-900">CHI TIẾT SẢN PHẨM</h2>
          </div>

          <dl className="mt-7 space-y-0 text-sm">
            {detailRows.map((row) => (
              <div key={row.label} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[210px_minmax(0,1fr)]">
                <dt className="text-stone-400">{row.label}</dt>
                <dd className="font-medium text-stone-800">{row.value}</dd>
              </div>
            ))}
          </dl>

          <section className="mt-8 border-t border-warm pt-6">
            <h3 className="text-base font-black uppercase tracking-normal text-stone-900">Mô tả sản phẩm</h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-stone-600">{product.description}</p>
            {product.images.length > 0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {product.images.slice(0, 6).map((image) => (
                  <div key={image.id} data-testid="description-image" className="relative aspect-[4/3] overflow-hidden border border-warm bg-white">
                    <Image
                      src={image.url}
                      alt={image.alt ?? product.name}
                      fill
                      className="object-cover"
                      onError={() => markImageFailed(image.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {hasSizeGuide && (
            <section ref={sizeGuideRef} id="size-guide" className="mt-8 scroll-mt-24 border-t border-warm pt-6">
              <h3 className="text-base font-black uppercase tracking-normal text-stone-900">Hướng dẫn chọn cỡ</h3>
              <p className="mt-3 text-sm leading-7 text-stone-600">
                Bảng này được tạo theo nhóm sản phẩm và các biến thể đang bán. Nếu bạn phân vân giữa hai cỡ, hãy chọn cỡ lớn hơn để thoải mái hơn.
              </p>
              <div className="mt-4 overflow-hidden border border-warm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs font-black uppercase text-stone-500">
                    <tr>
                      <th className="px-3 py-2">Cỡ</th>
                      <th className="px-3 py-2">Số đo gợi ý</th>
                      <th className="px-3 py-2">Thông số sản phẩm</th>
                      <th className="px-3 py-2">Lưu ý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm bg-white">
                    {sizeGuideRows.map((row) => (
                      <tr key={row.size}>
                        <td className="px-3 py-2 font-black text-stone-900">{row.size}</td>
                        <td className="px-3 py-2 text-stone-600">{row.body}</td>
                        <td className="px-3 py-2 text-stone-600">{row.product}</td>
                        <td className="px-3 py-2 text-stone-600">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="mt-8 border-t border-warm pt-6">
            <h3 className="text-base font-black uppercase tracking-normal text-stone-900">Cam kết khách hàng</h3>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-600">
              <li>Sản phẩm đúng mô tả và được kiểm tra trước khi giao.</li>
              <li>Hỗ trợ đổi trả theo chính sách Lishop nếu sản phẩm lỗi hoặc sai phiên bản.</li>
              <li>Tư vấn nhanh qua chat và cập nhật trạng thái đơn hàng liên tục.</li>
            </ul>
          </section>
        </section>

        <aside data-testid="product-detail-sidebar" className="space-y-4">
          <section className="bg-white px-4 py-5 shadow-sm ring-1 ring-warm">
            <h2 className="text-sm font-semibold text-stone-400">Mã giảm giá của Shop</h2>
            <div className="mt-5 space-y-3">
              {storeCoupons.map((coupon) => {
                const isSaved = savedCouponCodes.includes(coupon.code);
                return (
                <div key={coupon.code} className="grid min-h-24 grid-cols-[1fr_70px] overflow-hidden border border-red-100 bg-red-50 text-red-500">
                  <div className="flex flex-col justify-center px-3">
                    <p className="text-sm font-black leading-tight">{coupon.title}</p>
                    <p className="mt-0.5 text-xs font-semibold leading-tight">{coupon.condition}</p>
                    <p className="mt-1 text-[11px] font-bold text-red-600">{coupon.code}</p>
                    <p className="mt-2 text-[11px] text-stone-500">HSD: 20.07.2026</p>
                  </div>
                  <div className="flex items-center justify-center border-l border-dashed border-red-200 bg-red-50">
                    <button
                      type="button"
                      onClick={() => saveStoreCoupon(coupon.code)}
                      className={`h-9 rounded-sm px-4 text-xs font-black text-white transition ${isSaved ? 'bg-stone-400' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                      {isSaved ? 'Đã lưu' : 'Lưu'}
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          </section>

          <section className="bg-white px-4 py-5 shadow-sm ring-1 ring-warm">
            <h2 className="text-sm font-semibold text-stone-400">Sản phẩm nổi bật</h2>
            <Link href={`/products/${product.slug}`} className="mt-5 block transition hover:opacity-90">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-100">
                {featuredImage ? (
                  <Image
                    src={featuredImage.url}
                    alt={featuredImage.alt ?? product.name}
                    fill
                    className="object-cover"
                    onError={() => markImageFailed(featuredImage.id)}
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-sm font-semibold text-muted">Chưa có ảnh</span>
                )}
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold uppercase leading-5 text-stone-700">{product.name}</h3>
              <p className="mt-1 text-base font-black text-red-500">{formatVND(effectivePriceVnd)}</p>
            </Link>
          </section>
        </aside>
      </div>

      <ReviewsSection productId={product.id} />
      <RelatedProducts slug={slug} />
      <StoreChatPanel
        open={showStoreChat}
        onClose={() => setShowStoreChat(false)}
        shopName={shopName}
        productName={product.name}
        variantLabel={selectedVariant ? getVariantLabel(selectedVariant) : ''}
      />
      <ChatWidget />
    </div>
  );
}
