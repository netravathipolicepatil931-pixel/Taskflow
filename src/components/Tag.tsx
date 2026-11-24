import { Hash, X } from 'lucide-react';
import type { Tag as TagType } from '../types';

interface TagProps {
  tag: TagType;
  onRemove?: () => void;
  onClick?: () => void;
}

export function Tag({ tag, onRemove, onClick }: TagProps) {
  const content = (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
      <Hash className="w-3 h-3 shrink-0" style={{ color: tag.color }} />
      <span>{tag.name}</span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
      >
        {content}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
      {content}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove tag ${tag.name}`}
          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
