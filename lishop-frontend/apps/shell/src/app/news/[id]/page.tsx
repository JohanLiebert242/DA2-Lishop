import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNewsItem, NEWS_ITEMS } from '../../../lib/news';

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return NEWS_ITEMS.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const item = getNewsItem(id);
  if (!item) return { title: 'Bảng tin Lishop' };

  return {
    title: `${item.title} | Bảng tin Lishop`,
    description: item.summary,
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const item = getNewsItem(id);
  if (!item) notFound();

  const related = NEWS_ITEMS.filter((news) => news.id !== item.id);

  return (
    <div className="min-h-screen bg-warm">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/news" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Về bảng tin
            </Link>
            <Link href="/" className="inline-flex rounded-2xl px-4 py-2 text-sm font-bold text-stone-500 transition hover:bg-stone-50 hover:text-stone-900">
              Trang chủ
            </Link>
          </div>

          <div className="mt-9 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-400">
              <span className="text-amber-600">{item.tag}</span>
              <span>•</span>
              <span>{item.date}</span>
              <span>•</span>
              <span>{item.readTime}</span>
            </div>
            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-stone-950 sm:text-5xl">
              {item.title}
            </h1>
            <p className="mt-5 text-lg leading-8 text-stone-600">{item.summary}</p>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="relative aspect-[16/8] bg-stone-100">
            <Image src={item.imageUrl} alt={item.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 760px" />
          </div>
          <div className="px-6 py-8 sm:px-10">
            <div className="space-y-6">
              {item.content.map((paragraph, index) => (
                <p key={`${item.id}-${index}`} className="text-base leading-8 text-stone-700">
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-700">Gợi ý tiếp theo</p>
              <p className="mt-2 text-sm leading-7 text-amber-900">
                Theo dõi bảng tin Lishop để cập nhật các thay đổi về coupon, đơn hàng, ví, thông báo và trải nghiệm mua sắm trong từng phase phát triển.
              </p>
            </div>
          </div>
        </article>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-stone-400">Bài liên quan</p>
            <div className="mt-4 space-y-4">
              {related.map((news) => (
                <Link key={news.id} href={`/news/${news.id}`} className="block rounded-2xl border border-stone-100 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">{news.tag}</p>
                  <h2 className="mt-2 text-sm font-black leading-6 text-stone-900">{news.title}</h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-500">{news.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
