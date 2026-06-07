'use client';

import type { LucideIcon } from 'lucide-react';

const TONE_STYLES = {
  indigo: 'from-indigo-500/18 to-blue-500/8 text-indigo-700',
  emerald: 'from-emerald-500/18 to-teal-500/8 text-emerald-700',
  amber: 'from-amber-500/18 to-orange-500/8 text-amber-700',
  rose: 'from-rose-500/18 to-pink-500/8 text-rose-700',
  sky: 'from-sky-500/18 to-cyan-500/8 text-sky-700',
} as const;

export function AdminMetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'indigo',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONE_STYLES;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${TONE_STYLES[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
