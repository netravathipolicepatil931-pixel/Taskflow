import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Hash,
  Inbox,
  LayoutDashboard,
  ListTodo,
  Plus,
  Search,
  Settings,
  Star,
  Sun,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type { AuthSessionUser, NavSection, Profile, Project, Tag, Task } from '../types';
import { getTodayISO } from '../utils/dateUtils';
import { getProjectIcon } from './ProjectCard';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  activeSection: NavSection;
  activeProjectId: string | null;
  user: AuthSessionUser | null;
  profile: Profile | null;
  tasks: Task[];
  projects: Project[];
  tags: Tag[];
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (section: NavSection, projectId?: string) => void;
  onOpenSearch: () => void;
  onCreateProject: () => void;
  onSwitchWorkspaceName: (name: string) => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  activeSection,
  activeProjectId,
  user,
  profile,
  tasks,
  projects,
  tags,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
  onOpenSearch,
  onCreateProject,
  onSwitchWorkspaceName,
}: SidebarProps) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const today = getTodayISO();
  const activeTasks = tasks.filter((t) => !t.is_archived);
  const inboxCount = activeTasks.filter(
    (t) => t.status !== 'completed' && !t.due_date && !t.project_id
  ).length;
  const todayCount = activeTasks.filter(
    (t) => t.status !== 'completed' && (t.due_date === today || (t.due_date && t.due_date < today))
  ).length;
  const importantCount = activeTasks.filter(
    (t) => t.status !== 'completed' && t.is_important
  ).length;

  const navItems: Array<{
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox, count: inboxCount },
    { id: 'today', label: 'Today', icon: Sun, count: todayCount },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarClock },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'all', label: 'All Tasks', icon: ListTodo },
    { id: 'important', label: 'Important', icon: Star, count: importantCount },
    { id: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];

  const workspaceOptions = ['Personal Workspace', 'Product & Engineering', 'Deep Focus'];
  const currentWorkspace = profile?.workspace_name || 'Personal Workspace';

  const displayName =
    (profile?.full_name && profile.full_name !== 'Workspace User'
      ? profile.full_name
      : user?.full_name) || 'Workspace User';
  const avatarUrl = user?.avatarUrl || profile?.avatar_url || null;

  const renderSidebarContent = (isMobile: boolean) => {
    const isNarrow = collapsed && !isMobile;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
        {/* Brand & Collapse */}
        <div className="flex items-center justify-between px-3.5 h-14 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            type="button"
            onClick={() => {
              onNavigate('dashboard');
              if (isMobile) onCloseMobile();
            }}
            className="flex items-center gap-2.5 min-w-0 focus-visible:outline-2 focus-visible:outline-blue-600 rounded-md"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-display font-bold text-sm shrink-0">
              T
            </span>
            {!isNarrow && (
              <span className="font-display font-semibold text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                TaskFlow
              </span>
            )}
          </button>

          {isMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isNarrow ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isNarrow ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {isNarrow ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Workspace Switcher & Search */}
        <div className="px-2.5 pt-3 pb-2 space-y-1.5 shrink-0">
          {!isNarrow && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setWorkspaceOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors"
              >
                <span className="truncate">{currentWorkspace}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {workspaceOpen && (
                <div className="absolute left-0 right-0 mt-1 z-20 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg py-1">
                  {workspaceOptions.map((ws) => (
                    <button
                      key={ws}
                      type="button"
                      onClick={() => {
                        onSwitchWorkspaceName(ws);
                        setWorkspaceOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                        ws === currentWorkspace
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {ws}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onOpenSearch();
              if (isMobile) onCloseMobile();
            }}
            title="Search (Ctrl+K)"
            className={`w-full flex items-center ${
              isNarrow ? 'justify-center px-0' : 'justify-between px-2.5'
            } h-9 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors`}
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 shrink-0" />
              {!isNarrow && <span>Search</span>}
            </span>
            {!isNarrow && (
              <kbd className="text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-5">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigate(item.id);
                    if (isMobile) onCloseMobile();
                  }}
                  title={isNarrow ? item.label : undefined}
                  className={`w-full flex items-center ${
                    isNarrow ? 'justify-center px-0' : 'justify-between px-2.5'
                  } h-9 rounded-lg text-sm transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!isNarrow && <span className="truncate">{item.label}</span>}
                  </span>
                  {!isNarrow && typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-xs font-mono text-slate-400 dark:text-slate-500 tabular-nums">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* My Projects */}
          <div>
            {!isNarrow && (
              <div className="flex items-center justify-between px-2.5 mb-1.5">
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                  My Projects
                </span>
                <button
                  type="button"
                  onClick={onCreateProject}
                  aria-label="Create project"
                  title="New project"
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {projects.map((proj) => {
                const ProjIcon = getProjectIcon(proj.icon);
                const isActive = activeSection === 'project' && activeProjectId === proj.id;
                const openCount = activeTasks.filter(
                  (t) => t.project_id === proj.id && t.status !== 'completed'
                ).length;

                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      onNavigate('project', proj.id);
                      if (isMobile) onCloseMobile();
                    }}
                    title={isNarrow ? proj.name : undefined}
                    className={`w-full flex items-center ${
                      isNarrow ? 'justify-center px-0' : 'justify-between px-2.5'
                    } h-9 rounded-lg text-sm transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <ProjIcon className="w-4 h-4 shrink-0" style={{ color: proj.color }} />
                      {!isNarrow && <span className="truncate">{proj.name}</span>}
                    </span>
                    {!isNarrow && openCount > 0 && (
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        {openCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags & Settings */}
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onNavigate('tags');
                if (isMobile) onCloseMobile();
              }}
              title={isNarrow ? 'Tags' : undefined}
              className={`w-full flex items-center ${
                isNarrow ? 'justify-center px-0' : 'justify-between px-2.5'
              } h-9 rounded-lg text-sm transition-colors whitespace-nowrap ${
                activeSection === 'tags'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Hash className="w-4 h-4 shrink-0" />
                {!isNarrow && <span>Tags</span>}
              </span>
              {!isNarrow && tags.length > 0 && (
                <span className="text-xs font-mono text-slate-400 tabular-nums">
                  {tags.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onNavigate('settings');
                if (isMobile) onCloseMobile();
              }}
              title={isNarrow ? 'Settings' : undefined}
              className={`w-full flex items-center ${
                isNarrow ? 'justify-center px-0' : 'justify-between px-2.5'
              } h-9 rounded-lg text-sm transition-colors whitespace-nowrap ${
                activeSection === 'settings'
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 shrink-0" />
                {!isNarrow && <span>Settings</span>}
              </span>
            </button>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-2.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <div
            className={`flex items-center ${
              isNarrow ? 'justify-center' : 'justify-start'
            } gap-2 px-1.5 py-1.5 rounded-lg`}
          >
            <button
              type="button"
              onClick={() => {
                onNavigate('settings');
                if (isMobile) onCloseMobile();
              }}
              className="flex items-center gap-2.5 min-w-0 w-full text-left hover:opacity-80 transition-opacity"
            >
              <UserAvatar name={displayName} avatarUrl={avatarUrl} size="md" />
              {!isNarrow && (
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {user?.email || currentWorkspace}
                  </p>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-200 ease-out h-screen sticky top-0 ${
          collapsed ? 'w-[64px]' : 'w-[256px]'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px]"
          />
          <div className="relative w-[272px] max-w-[85vw] h-full z-10">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
}
