import { Layers, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ArtifactHash } from './ArtifactHash';
import { VerificationStatus } from './VerificationStatus';
import type { BlockchainStatus } from '@/types/audit';

interface BlockchainRecordProps {
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: string;
  network?: string;
  status?: BlockchainStatus;
  contentHash?: string;
  className?: string;
}

export function BlockchainRecord({
  transactionHash,
  blockNumber,
  timestamp,
  network = 'AEGIS Private Ledger (L2)',
  status = 'confirmed',
  contentHash,
  className,
}: BlockchainRecordProps) {
  return (
    <Card padding="md" className={className}>
      <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-accent-primary" />
          <span className="text-xs font-medium text-text-primary">Immutable Ledger Record</span>
        </div>
        <VerificationStatus status={status} size="sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {transactionHash && (
          <div>
            <span className="text-text-muted block mb-1">Transaction Hash</span>
            <ArtifactHash hash={transactionHash} length={10} className="-ml-1" />
          </div>
        )}

        {contentHash && (
          <div>
            <span className="text-text-muted block mb-1">Artifact Content Hash (SHA-256)</span>
            <ArtifactHash hash={contentHash} length={10} className="-ml-1" />
          </div>
        )}

        {blockNumber !== undefined && (
          <div>
            <span className="text-text-muted block mb-1">Block Height</span>
            <div className="flex items-center gap-1.5 font-mono text-text-secondary">
              <Layers className="h-3 w-3 text-text-dim" />
              <span>#{blockNumber.toLocaleString()}</span>
            </div>
          </div>
        )}

        <div>
          <span className="text-text-muted block mb-1">Network</span>
          <div className="flex items-center gap-1.5">
            <span className="text-text-secondary">{network}</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1">Proof-of-Authority</Badge>
          </div>
        </div>

        {timestamp && (
          <div className="md:col-span-2 text-text-dim text-[11px] pt-1">
            Anchored at: {new Date(timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </Card>
  );
}
