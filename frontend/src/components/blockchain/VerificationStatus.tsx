import { CheckCircle2, AlertTriangle, Clock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockchainStatus } from '@/types/audit';

interface VerificationStatusProps {
  status?: BlockchainStatus;
  match?: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function VerificationStatus({
  status,
  match,
  size = 'md',
  showLabel = true,
  className,
}: VerificationStatusProps) {
  const isPending = status === 'pending';
  const isFailed = match === false || status === 'failed';
  const isNotRecorded = status === 'not_recorded';

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  if (isPending) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-status-warning', textSize, className)}>
        <Clock className={cn(iconSize, 'animate-spin-slow shrink-0')} />
        {showLabel && <span>Pending Verification</span>}
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-status-danger', textSize, className)}>
        <AlertTriangle className={cn(iconSize, 'shrink-0')} />
        {showLabel && <span>Hash Mismatch</span>}
      </span>
    );
  }

  if (isNotRecorded) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 text-text-dim', textSize, className)}>
        <HelpCircle className={cn(iconSize, 'shrink-0')} />
        {showLabel && <span>Not Recorded</span>}
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-status-success', textSize, className)}>
      <CheckCircle2 className={cn(iconSize, 'shrink-0')} />
      {showLabel && <span>{match !== undefined ? 'Hash Verified' : 'Confirmed on Chain'}</span>}
    </span>
  );
}
