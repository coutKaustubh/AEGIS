import { Shield, FileUp, CheckCircle, XCircle, Bot, Database, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArtifactHash } from './ArtifactHash';
import { VerificationStatus } from './VerificationStatus';
import type { AuditRecord, AuditAction } from '@/types/audit';

interface AuditTimelineProps {
  records: AuditRecord[];
  onSelectRecord?: (record: AuditRecord) => void;
  selectedId?: string;
  className?: string;
}

const actionIcons: Record<AuditAction, React.ReactNode> = {
  DOCUMENT_UPLOADED: <FileUp className="h-3.5 w-3.5" />,
  AI_ANALYSIS: <Bot className="h-3.5 w-3.5" />,
  DOCUMENT_GENERATED: <FileUp className="h-3.5 w-3.5" />,
  HUMAN_APPROVED: <CheckCircle className="h-3.5 w-3.5" />,
  HUMAN_REJECTED: <XCircle className="h-3.5 w-3.5" />,
  ARTIFACT_VERIFIED: <Shield className="h-3.5 w-3.5" />,
  KNOWLEDGE_INDEXED: <Database className="h-3.5 w-3.5" />,
  AGENT_EXECUTED: <Bot className="h-3.5 w-3.5" />,
  MODEL_INVOKED: <Bot className="h-3.5 w-3.5" />,
  CODE_EXECUTED: <Eye className="h-3.5 w-3.5" />,
};

export function AuditTimeline({
  records,
  onSelectRecord,
  selectedId,
  className,
}: AuditTimelineProps) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-text-dim text-xs">
        No provenance timeline records found.
      </div>
    );
  }

  return (
    <div className={cn('relative pl-6 space-y-6', className)}>
      {/* Timeline spine */}
      <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border-subtle" />

      {records.map((rec) => {
        const isSelected = selectedId === rec.id;
        const icon = actionIcons[rec.action] || <Shield className="h-3.5 w-3.5" />;

        return (
          <div
            key={rec.id}
            onClick={() => onSelectRecord?.(rec)}
            className={cn(
              'relative group cursor-pointer transition-colors',
              isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
            )}
          >
            {/* Timeline Node Icon */}
            <div
              className={cn(
                'absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center border text-[10px] transition-colors',
                isSelected
                  ? 'bg-accent-primary text-white border-accent-primary'
                  : 'bg-bg-surface border-border-default text-text-secondary group-hover:border-border-hover'
              )}
            >
              {icon}
            </div>

            {/* Event Body */}
            <div
              className={cn(
                'p-3 rounded-lg border text-xs transition-colors',
                isSelected
                  ? 'bg-bg-subtle border-border-hover'
                  : 'bg-bg-surface/50 border-border-subtle hover:border-border-default hover:bg-bg-subtle/50'
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-medium text-text-primary">
                  {rec.action.replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-text-dim">
                  {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="text-text-muted text-[11px] mb-2 flex items-center gap-2">
                <span>By: <span className="text-text-secondary">{rec.actor}</span></span>
                {rec.model && (
                  <span>• Model: <span className="font-mono text-text-secondary">{rec.model}</span></span>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                <ArtifactHash hash={rec.hash} length={6} />
                <VerificationStatus status={rec.blockchainStatus} size="sm" showLabel={false} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
