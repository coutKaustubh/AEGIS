import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HashValueProps {
  hash: string;
  truncate?: boolean;
  length?: number;
  className?: string;
}

export function HashValue({ hash, truncate = true, length = 8, className }: HashValueProps) {
  const [copied, setCopied] = useState(false);

  const displayHash = truncate && hash.length > length * 2 + 3
    ? `${hash.slice(0, length)}...${hash.slice(-length)}`
    : hash;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={`Click to copy: ${hash}`}
      className={cn(
        'group inline-flex items-center gap-1.5 font-mono text-xs text-text-muted hover:text-text-primary px-1.5 py-0.5 rounded transition-colors hover:bg-bg-subtle',
        className
      )}
    >
      <span>{displayHash}</span>
      {copied ? (
        <Check className="h-3 w-3 text-status-success shrink-0" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 text-text-dim transition-opacity shrink-0" />
      )}
    </button>
  );
}
