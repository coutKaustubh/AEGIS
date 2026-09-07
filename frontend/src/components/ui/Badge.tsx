import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-secondary border-border-default',
  success: 'bg-success-muted text-success border-success/15',
  warning: 'bg-warning-muted text-warning border-warning/15',
  danger: 'bg-danger-muted text-danger border-danger/15',
  info: 'bg-accent-muted text-accent border-accent/15',
  outline: 'bg-transparent text-text-secondary border-border-strong',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide border',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
