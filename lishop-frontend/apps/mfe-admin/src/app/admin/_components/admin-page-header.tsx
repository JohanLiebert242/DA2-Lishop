'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type HeaderStat = {
  label: string;
  value: string;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
};

const TONE_STYLES = {
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  sky: 'bg-sky-100 text-sky-700',
} as const;

export function AdminPageHeader({
  icon: Icon,
  title,
  description,
  badge,
  stats = [],
  tone = 'indigo',
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
  stats?: HeaderStat[];
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
  action?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-[0_20px_80px_-48px_rgba(15,23,42,0.45)]">
      <div className="p-6 xl:p-7">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${TONE_STYLES[tone]}`}>
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
                {badge ? (
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE_STYLES[tone]}`}>{badge}</span>
                ) : null}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          {stats.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <div key={`${stat.label}-${stat.value}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-950">{stat.value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
