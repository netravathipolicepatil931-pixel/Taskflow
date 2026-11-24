import { AlertCircle, ArrowDown, ArrowRight, Flame } from 'lucide-react';
import type { TaskPriority } from '../types';

interface PriorityBadgeProps {
  priority: TaskPriority;
  compact?: boolean;
}

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; colorClass: string; icon: typeof ArrowDown }
> = {
  low: {
    label: 'Low',
    colorClass: 'text-slate-500 dark:text-slate-400',
    icon: ArrowDown,
  },
  medium: {
    label: 'Medium',
    colorClass: 'text-blue-600 dark:text-blue-400',
    icon: ArrowRight,
  },
  high: {
    label: 'High',
    colorClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertCircle,
  },
  urgent: {
    label: 'Urgent',
    colorClass: 'text-red-600 dark:text-red-400',
    icon: Flame,
  },
};

export function PriorityBadge({ priority, compact = false }: PriorityBadgeProps) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap shrink-0 ${meta.colorClass}`}
      title={`Priority: ${meta.label}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      {!compact && <span>{meta.label}</span>}
    </span>
  );
}
