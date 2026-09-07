import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Loader2,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { mockApprovals } from '@/data/mock-data';
import type { ApprovalStatus, Approval } from '@/types/approval';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { BlockchainRecord } from '@/components/blockchain/BlockchainRecord';
import { useAuth } from '@/context/AuthContext';
import { blockchainService, hashFile } from '@/services/blockchain';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const initialApproval = useMemo(() => {
    return mockApprovals.find((a) => a.id === id) || mockApprovals[0];
  }, [id]);

  const [approval, setApproval] = useState<Approval>(initialApproval);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const handleDecision = async (newStatus: ApprovalStatus) => {
    setIsProcessing(true);
    setDecisionError(null);

    try {
      const reviewedAt = new Date().toISOString();
      let blockchainFields: Pick<Approval, 'artifactHash' | 'blockchainTxHash' | 'blockchainBlockNumber' | 'blockchainTimestamp' | 'blockchainNetwork'> = {};

      if (newStatus === 'approved') {
        if (!artifactFile) {
          throw new Error('Select the generated artifact before anchoring the approval.');
        }

        const artifactHash = await hashFile(artifactFile);
        const transaction = await blockchainService.recordArtifact({
          artifactId: approval.documentId,
          contentHash: artifactHash,
          timestamp: Date.now(),
          actor: user?.name || 'Authorized Operator',
          eventType: 'HUMAN_APPROVED',
          metadata: JSON.stringify({ approvalId: approval.id, fileName: artifactFile.name }),
        });

        blockchainFields = {
          artifactHash,
          blockchainTxHash: transaction.transactionHash,
          blockchainBlockNumber: transaction.blockNumber,
          blockchainTimestamp: transaction.timestamp,
          blockchainNetwork: blockchainService.getConfig().networkName,
        };
      }

      setApproval((prev) => ({
        ...prev,
        status: newStatus,
        reviewer: user?.name ? `${user.name} (Authorized Operator)` : 'Authorized Operator',
        reviewedAt,
        reviewerComment:
          comment ||
          (newStatus === 'approved'
            ? 'Cryptographically verified and authorized for operational execution.'
            : newStatus === 'revision'
            ? 'Revisions requested on safety margins.'
            : 'Rejected due to non-compliance.'),
        ...blockchainFields,
      }));
      setArtifactFile(null);
    } catch (error) {
      setDecisionError(error instanceof Error ? error.message : 'Unable to complete the approval action.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">{approval.blockchainTxHash ? 'Approved & Anchored' : 'Approved'}</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'revision':
        return <Badge variant="warning">Revision Requested</Badge>;
      default:
        return <Badge variant="warning">Pending Sign-off</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/approvals"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Approvals Queue</span>
      </Link>

      <PageHeader
        title={approval.documentName}
        description={`Request ID: ${approval.id} · Initiated ${formatRelativeTime(approval.createdAt)}`}
        badge={getStatusBadge(approval.status)}
      />

      <div className="space-y-6">
        {/* Main Proposal Card */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Action Specifications & Analysis
            </span>
            <span className="text-xs font-mono text-text-dim">
              Risk Category: High
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            {approval.requestDetail}
          </p>

          {/* Sources and Context */}
          {approval.sources && approval.sources.length > 0 && (
            <div className="pt-2 border-t border-border-subtle space-y-2">
              <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider block">
                Referenced Documents
              </span>
              <div className="flex flex-wrap gap-2">
                {approval.sources.map((src, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-bg-primary border border-border-subtle text-xs text-text-muted font-mono"
                  >
                    <FileText className="h-3 w-3 text-text-dim" />
                    {src.documentName} (p. {src.page})
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Operator Decision Box */}
        {approval.status === 'pending' ? (
          <Card padding="md" className="space-y-4 border-border-default">
            <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
              Operator Cryptographic Sign-Off
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter optional sign-off remarks or reasons for revision..."
              rows={3}
              className="w-full rounded-md border border-border-default bg-bg-primary p-3 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:border-border-hover transition-colors"
            />

            <div className="space-y-2 rounded-md border border-border-subtle bg-bg-primary/40 p-3">
              <label htmlFor="approval-artifact" className="block text-[11px] font-mono uppercase tracking-wider text-text-muted">
                Generated artifact to anchor
              </label>
              <input
                id="approval-artifact"
                type="file"
                onChange={(event) => setArtifactFile(event.target.files?.[0] || null)}
                className="block w-full text-xs text-text-secondary file:mr-3 file:rounded file:border-0 file:bg-bg-surface file:px-2.5 file:py-1.5 file:text-xs file:text-text-primary"
              />
              <p className="text-[11px] text-text-dim">
                The file is hashed locally in the browser. Only its SHA-256 digest is sent to the ledger.
              </p>
            </div>

            {decisionError && (
              <div className="rounded-md border border-status-danger/30 bg-status-danger/10 px-3 py-2 text-xs text-status-danger">
                {decisionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={isProcessing}
                onClick={() => handleDecision('rejected')}
              >
                <XCircle className="h-3.5 w-3.5 text-status-danger" />
                <span>Reject</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={isProcessing}
                onClick={() => handleDecision('revision')}
              >
                <RotateCcw className="h-3.5 w-3.5 text-status-warning" />
                <span>Request Revision</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={isProcessing}
                onClick={() => handleDecision('approved')}
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Authorize & Anchor</span>
              </Button>
            </div>
          </Card>
        ) : (
          /* Sign-off audit note */
          <Card padding="md" className="space-y-3 bg-bg-surface">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-semibold text-text-primary font-mono uppercase tracking-wider">
                Operator Sign-off Record
              </span>
              <span className="text-[11px] font-mono text-text-dim">
                {approval.reviewedAt && new Date(approval.reviewedAt).toLocaleString()}
              </span>
            </div>

            <div className="text-xs space-y-1">
              <div className="text-text-dim">Authorized By: <span className="text-text-primary font-medium">{approval.reviewer}</span></div>
              <p className="text-text-muted italic bg-bg-primary/50 p-2.5 rounded border border-border-subtle">
                "{approval.reviewerComment}"
              </p>
            </div>

            {approval.blockchainTxHash && (
              <div className="pt-2">
                <BlockchainRecord
                  transactionHash={approval.blockchainTxHash}
                  contentHash={approval.artifactHash}
                  blockNumber={approval.blockchainBlockNumber}
                  timestamp={approval.blockchainTimestamp || approval.reviewedAt}
                  network={approval.blockchainNetwork || blockchainService.getConfig().networkName}
                  status="confirmed"
                />
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
