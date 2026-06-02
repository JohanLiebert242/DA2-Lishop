import Image from 'next/image';
import Link from 'next/link';
import { NEWS_ITEMS } from '../../lib/news';

export default function NewsPage() {
  const [lead, ...rest] = NEWS_ITEMS;
  if (!lead) return null;

  return (
    <div className="min-h-screen bg-warm">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Về trang chủ
          </Link>
          <div className="mt-8 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Bảng tin Lishop</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
                Tin mới về coupon, trải nghiệm mua sắm và ưu đãi thành viên.
              </h1>
              <p className="mt-4 text-base leading-8 text-muted">
                Cập nhật những thay đổi quan trọng trong hệ sinh thái Lishop để khách hàng biết cách mua sắm thông minh hơn.
              </p>
            </div>
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-stone-100 shadow-xl shadow-stone-900/10">
              <Image src={lead.imageUrl} alt={lead.title} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 520px" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <article id={lead.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-80 bg-stone-100">
              <Image src={lead.imageUrl} alt={lead.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 520px" />
            </div>
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-400">
                <span>{lead.tag}</span>
                <span>•</span>
                <span>{lead.date}</span>
                <span>•</span>
                <span>{lead.readTime}</span>
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight text-stone-950">{lead.title}</h2>
              <p className="mt-3 text-base leading-8 text-stone-600">{lead.summary}</p>
              <div className="mt-6 space-y-4">
                {lead.content.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-stone-600">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        </article>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {rest.map((item) => (
            <article id={item.id} key={item.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              <div className="relative aspect-[16/9] bg-stone-100">
                <Image src={item.imageUrl} alt={item.title} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 520px" />
              </div>
              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-400">
                  <span>{item.tag}</span>
                  <span>•</span>
                  <span>{item.date}</span>
                  <span>•</span>
                  <span>{item.readTime}</span>
                </div>
                <h2 className="mt-4 text-2xl font-black leading-tight text-stone-950">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{item.summary}</p>
                <div className="mt-5 space-y-3">
                  {item.content.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-7 text-stone-600">{paragraph}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
