import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  Bot,
  CheckCircle,
  Shield,
  Server,
  Settings,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Command,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME, APP_SUBTITLE, NAV_ITEMS } from '@/lib/constants';
import { approvalService } from '@/services/approvals';
import { StatusDot } from '@/components/ui/StatusDot';
import { useAuth } from '@/context/AuthContext';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BookOpen,
  Bot,
  CheckCircle,
  Shield,
  Server,
  Settings,
  Users,
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenCommandPalette?: () => void;
}

export function Sidebar({ collapsed, onToggleCollapse, onOpenCommandPalette }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  useEffect(() => {
    void approvalService.list('pending').then((items) => setPendingApprovalsCount(items.length)).catch(() => setPendingApprovalsCount(0));
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
    : 'AE';

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-all duration-200 select-none',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-14 items-center justify-between border-b border-border-subtle px-3.5">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-elevated border border-border-subtle font-mono text-xs font-semibold text-text-primary">
            Æ
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wider text-text-primary uppercase leading-tight">
                {APP_NAME}
              </div>
              <div className="text-[10px] text-text-dim truncate leading-tight">
                {APP_SUBTITLE}
              </div>
            </div>
          )}
        </Link>

        {!collapsed && onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            title="Open Command Palette (Ctrl+K)"
            className="flex items-center gap-1 text-[11px] text-text-dim hover:text-text-secondary px-1.5 py-0.5 rounded border border-border-subtle hover:border-border-default transition-colors"
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item, index) => {
          if ('type' in item && item.type === 'divider') {
            return (
              <div
                key={`divider-${index}`}
                className="my-2 border-t border-border-subtle/60"
              />
            );
          }

          if (!('path' in item)) return null;

          // Enclave Role-based navigation filtering:
          // Admin-only pages are completely hidden from employees
          if ('adminOnly' in item && item.adminOnly && !isAdmin) {
            return null;
          }

          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');

          const hasBadge = item.path === '/approvals' && pendingApprovalsCount > 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                'group relative flex items-center justify-between rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-bg-subtle text-text-primary shadow-xs'
                  : 'text-text-muted hover:bg-bg-subtle/50 hover:text-text-primary'
              )}
            >
              {/* Subtle active left accent indicator */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-accent-primary" />
              )}

              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-accent-primary' : 'text-text-dim group-hover:text-text-secondary'
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && hasBadge && (
                <span className="rounded-full bg-status-warning/15 px-1.5 py-0.2 text-[10px] font-mono text-status-warning border border-status-warning/30">
                  {pendingApprovalsCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Local Air-gap & Sovereignty Status */}
      <div className="px-2.5 py-2 border-t border-border-subtle/60">
        {!collapsed ? (
          <div className="flex items-center justify-between px-2 py-1.5 rounded bg-bg-subtle/40 text-[11px] text-text-muted border border-border-subtle/40">
            <div className="flex items-center gap-2">
              <StatusDot color="success" pulse />
              <span className="font-mono text-[10px] uppercase text-text-secondary font-medium tracking-wide">
                Air-Gapped / Local
              </span>
            </div>
            <span className="text-[10px] font-mono text-text-dim">PoA</span>
          </div>
        ) : (
          <div className="flex justify-center py-1" title="Air-Gapped / Local Execution">
            <StatusDot color="success" pulse />
          </div>
        )}
      </div>

      {/* User profile & collapse control */}
      <div className="flex items-center justify-between border-t border-border-subtle px-3 py-2.5">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-bg-elevated text-[11px] font-semibold text-text-secondary border border-border-subtle font-mono">
            {userInitials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-text-primary">
                {user?.name || 'Enclave Operator'}
              </div>
              <div className="truncate text-[10px] text-text-dim capitalize">
                {user?.role || 'Enclave Node'}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out / Disconnect Session"
              className="p-1 text-text-dim hover:text-status-danger rounded hover:bg-bg-subtle transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'p-1 text-text-dim hover:text-text-primary rounded hover:bg-bg-subtle transition-colors',
              collapsed && 'w-full flex justify-center mt-1'
            )}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
