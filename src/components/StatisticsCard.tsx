import type { LucideIcon } from 'lucide-react';

interface StatisticsCardProps {
  label: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

const TONE_MAP = {
  neutral: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60',
  warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60',
  danger: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60',
};

export function StatisticsCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = 'neutral',
  onClick,
}: StatisticsCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors ${
        onClick
          ? 'hover:border-slate-300 dark:hover:border-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 cursor-pointer'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONE_MAP[tone]}`}
        >
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 tabular-nums font-display">
          {value}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{subtitle}</span>
      </div>
    </Wrapper>
  );
}
