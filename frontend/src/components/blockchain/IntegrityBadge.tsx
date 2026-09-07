import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockchainStatus } from '@/types/audit';

interface IntegrityBadgeProps {
  status?: BlockchainStatus;
  verified?: boolean;
  className?: string;
}

export function IntegrityBadge({ status, verified, className }: IntegrityBadgeProps) {
  const isVerified = verified !== undefined ? verified : status === 'confirmed';
  const isPending = status === 'pending';

  if (isPending) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border border-status-warning/20 bg-status-warning/10 text-status-warning',
          className
        )}
      >
        <Shield className="h-3 w-3 animate-pulse" />
        <span>Anchoring</span>
      </span>
    );
  }

  if (isVerified) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border border-status-success/20 bg-status-success/10 text-status-success',
          className
        )}
      >
        <ShieldCheck className="h-3 w-3" />
        <span>Ledger Verified</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border border-status-danger/20 bg-status-danger/10 text-status-danger',
        className
      )}
    >
      <ShieldAlert className="h-3 w-3" />
      <span>Unverified</span>
    </span>
  );
}
