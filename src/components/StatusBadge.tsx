import { CheckCircle2, Circle, Clock } from 'lucide-react';
import type { TaskStatus } from '../types';

interface StatusBadgeProps {
  status: TaskStatus;
}

const STATUS_META: Record<
  TaskStatus,
  { label: string; colorClass: string; icon: typeof Circle }
> = {
  not_started: {
    label: 'Not Started',
    colorClass: 'text-slate-500 dark:text-slate-400',
    icon: Circle,
  },
  in_progress: {
    label: 'In Progress',
    colorClass: 'text-blue-600 dark:text-blue-400',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const meta = STATUS_META[status] ?? STATUS_META.not_started;
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${meta.colorClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
    </span>
  );
}
