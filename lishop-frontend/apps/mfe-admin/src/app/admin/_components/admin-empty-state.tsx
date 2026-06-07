'use client';

import type { LucideIcon } from 'lucide-react';
import { AdminShellIllustration } from './admin-shell-illustration';

export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  tone = 'sky',
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
}) {
  return (
    <div className="grid gap-5 rounded-3xl border border-dashed border-slate-300 bg-white/85 p-6 text-center shadow-sm md:grid-cols-[minmax(0,1fr)_220px] md:text-left">
      <div className="flex flex-col items-center justify-center gap-4 md:items-start">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="hidden md:block">
        <AdminShellIllustration tone={tone} compact showLogo={false} />
      </div>
    </div>
  );
}
