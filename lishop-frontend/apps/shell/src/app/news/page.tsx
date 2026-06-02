import Link from 'next/link';
import { NEWS_ITEMS } from '../../lib/news';

export default function NewsPage() {
  return (
    <div className="bg-warm min-h-screen">
      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 rounded-2xl border border-stone-200 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Về trang chủ
          </Link>
          <div className="mt-8 max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Bảng tin Lishop</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
              Tin mới về coupon, trải nghiệm mua sắm và ưu đãi thành viên.
            </h1>
            <p className="mt-4 text-base leading-8 text-muted">
              Cập nhật những thay đổi quan trọng trong hệ sinh thái Lishop để khách hàng biết cách mua sắm thông minh hơn.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-3">
          {NEWS_ITEMS.map((item, index) => (
            <article
              id={item.id}
              key={item.id}
              className={index === 0 ? 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm lg:col-span-2' : 'rounded-2xl border border-stone-200 bg-white p-6 shadow-sm'}
            >
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-stone-400">
                <span>{item.tag}</span>
                <span>•</span>
                <span>{item.date}</span>
              </div>
              <h2 className="mt-4 text-2xl font-black leading-tight text-stone-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{item.summary}</p>
              <div className="mt-6 rounded-2xl bg-stone-50 p-4">
                <p className="text-sm leading-7 text-stone-600">
                  Bản tin này được thiết kế cho demo Lishop: tập trung vào trải nghiệm thực tế, coupon hằng ngày,
                  đơn hàng giá trị cao và cách các micro-frontend phối hợp trong hành trình mua sắm.
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
