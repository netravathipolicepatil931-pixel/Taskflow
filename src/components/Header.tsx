import { Menu, Plus, Search } from 'lucide-react';
import type { ThemeMode } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

interface HeaderProps {
  title: string;
  description?: string;
  dateLabel?: string;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
  onAddTask: () => void;
  rightSlot?: React.ReactNode;
}

export function Header({
  title,
  description,
  dateLabel,
  theme,
  onThemeChange,
  onOpenMobileMenu,
  onOpenSearch,
  onAddTask,
  rightSlot,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FAFAFA]/90 dark:bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 truncate font-display">
                {title}
              </h1>
              {dateLabel && (
                <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap shrink-0">
                  {dateLabel}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {rightSlot}
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search tasks"
            title="Search (Ctrl+K)"
            className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          <ThemeSwitcher theme={theme} onChange={onThemeChange} compact />
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add Task</span>
          </button>
        </div>
      </div>
    </header>
  );
}
