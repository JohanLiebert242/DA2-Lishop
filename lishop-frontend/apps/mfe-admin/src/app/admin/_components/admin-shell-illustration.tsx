'use client';

import Image from 'next/image';

type IllustrationTone = 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';

const TONE_STYLES: Record<IllustrationTone, { shell: string; glow: string; accent: string; dot: string }> = {
  indigo: {
    shell: 'from-indigo-500/18 via-blue-500/10 to-violet-500/18',
    glow: 'bg-indigo-500/15',
    accent: 'bg-indigo-500/80',
    dot: 'bg-indigo-400/70',
  },
  emerald: {
    shell: 'from-emerald-500/18 via-teal-500/10 to-cyan-500/18',
    glow: 'bg-emerald-500/15',
    accent: 'bg-emerald-500/80',
    dot: 'bg-emerald-400/70',
  },
  amber: {
    shell: 'from-amber-500/18 via-orange-500/10 to-rose-500/18',
    glow: 'bg-amber-500/15',
    accent: 'bg-amber-500/80',
    dot: 'bg-amber-400/70',
  },
  rose: {
    shell: 'from-rose-500/18 via-fuchsia-500/10 to-pink-500/18',
    glow: 'bg-rose-500/15',
    accent: 'bg-rose-500/80',
    dot: 'bg-rose-400/70',
  },
  sky: {
    shell: 'from-sky-500/18 via-cyan-500/10 to-blue-500/18',
    glow: 'bg-sky-500/15',
    accent: 'bg-sky-500/80',
    dot: 'bg-sky-400/70',
  },
};

export function AdminShellIllustration({
  tone = 'indigo',
  compact = false,
  showLogo = true,
}: {
  tone?: IllustrationTone;
  compact?: boolean;
  showLogo?: boolean;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br ${styles.shell} ${
        compact ? 'h-28' : 'h-44'
      }`}
    >
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${styles.glow}`} />
      <div className={`absolute -bottom-10 left-6 h-24 w-24 rounded-full blur-2xl ${styles.glow}`} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0.18))]" />

      <div className="relative flex h-full items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          {showLogo && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white/85 shadow-sm">
              <Image src="/lishop-logo.png" alt="Lishop" width={40} height={40} className="object-contain" />
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Tổng quan trực tiếp
              </span>
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-14 rounded-2xl bg-white/75 shadow-sm" />
              <div className="h-10 w-20 rounded-2xl bg-white/65 shadow-sm" />
              <div className="h-10 w-12 rounded-2xl bg-white/55 shadow-sm" />
            </div>
          </div>
        </div>

        <div className="flex items-end gap-2">
          <div className="flex items-end gap-2 rounded-[28px] border border-white/70 bg-white/60 px-3 py-3 shadow-sm backdrop-blur">
            {[44, 68, 54, 82, 60].map((height, index) => (
              <div key={`${tone}-${height}-${index}`} className="flex flex-col items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-300/80" />
                <div className={`w-3 rounded-full ${styles.accent}`} style={{ height }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
