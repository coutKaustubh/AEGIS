import { cn } from '@/lib/utils';

type StatusDotColor = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusDotProps {
  color?: StatusDotColor;
  pulse?: boolean;
  className?: string;
}

const colorStyles: Record<StatusDotColor, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-accent',
  neutral: 'bg-text-tertiary',
};

export function StatusDot({ color = 'neutral', pulse = false, className }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block h-1.5 w-1.5 rounded-full shrink-0',
        colorStyles[color],
        pulse && 'animate-pulse',
        className,
      )}
    />
  );
}
