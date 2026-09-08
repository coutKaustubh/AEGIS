import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { approvalService } from '@/services/approvals';
import type { Approval } from '@/types/approval';

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<Approval | null>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    void approvalService.get(id).then((item) => setApproval(item || null)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load approval.')).finally(() => setLoading(false));
  }, [id]);

  const decide = async (decision: 'approve' | 'reject') => {
    if (!approval || !id) return;
    setBusy(true);
    try {
      const updated = decision === 'approve' ? await approvalService.approve(id, comment) : await approvalService.reject(id, comment);
      setApproval(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Approval decision failed.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading approval…</div>;
  if (!approval) return <div className="space-y-4"><Link to="/approvals" className="inline-flex items-center gap-2 text-xs text-accent-primary"><ArrowLeft className="h-4 w-4" />Back</Link><div className="text-xs text-status-danger">{error || 'Approval request not found.'}</div></div>;

  return <div className="max-w-4xl mx-auto space-y-6"><PageHeader title={approval.requestType} description="Protected operation approval" badge={<Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>{approval.status}</Badge>} actions={<Button variant="ghost" size="sm" onClick={() => navigate('/approvals')}><ArrowLeft className="h-4 w-4" />Back</Button>} /><Card className="space-y-5"><div><div className="text-[10px] uppercase tracking-wider text-text-dim">Target / command</div><div className="mt-2 whitespace-pre-wrap rounded bg-bg-primary p-3 font-mono text-xs text-text-primary">{approval.documentName}</div></div><div><div className="text-[10px] uppercase tracking-wider text-text-dim">Details</div><div className="mt-2 whitespace-pre-wrap rounded bg-bg-primary p-3 text-xs text-text-secondary">{approval.requestDetail}</div></div>{approval.status === 'pending' && <><textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={3} className="w-full rounded border border-border-default bg-bg-primary p-3 text-xs text-text-primary" placeholder="Decision reason (optional)" /><div className="flex gap-2"><Button variant="primary" onClick={() => void decide('approve')} disabled={busy}><CheckCircle2 className="h-4 w-4" />Approve</Button><Button variant="danger" onClick={() => void decide('reject')} disabled={busy}><XCircle className="h-4 w-4" />Deny</Button></div></>}{error && <div className="text-xs text-status-danger">{error}</div>}</Card></div>;
}
