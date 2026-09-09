import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { approvalService } from '@/services/approvals';
import type { Approval, ApprovalStatus } from '@/types/approval';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void approvalService.list().then(setApprovals).catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load approvals.')).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => activeTab === 'all' ? approvals : approvals.filter((item) => item.status === activeTab), [activeTab, approvals]);
  const counts = {
    pending: approvals.filter((item) => item.status === 'pending').length,
    approved: approvals.filter((item) => item.status === 'approved').length,
    rejected: approvals.filter((item) => item.status === 'rejected').length,
    expired: approvals.filter((item) => item.status === 'expired').length,
  };

  return <div className="max-w-5xl mx-auto space-y-6">
    <PageHeader title="Human-in-the-Loop Approvals" description="Protected AI actions waiting for an authorized decision" badge={<Badge variant="outline">{counts.pending} Pending</Badge>} />
    <div className="flex items-center gap-1 border-b border-border-subtle pb-2">{(['pending', 'approved', 'rejected', 'expired', 'all'] as const).map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-md text-xs capitalize ${activeTab === tab ? 'bg-bg-subtle text-text-primary' : 'text-text-muted'}`}>{tab} <span className="ml-1 font-mono text-[10px]">{tab === 'all' ? approvals.length : counts[tab]}</span></button>)}</div>
    {error && <div className="text-xs text-status-danger">{error}</div>}
    <Card padding="none" className="overflow-hidden divide-y divide-border-subtle">
      {loading ? <div className="flex items-center gap-2 p-8 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading permission requests…</div> : filtered.length === 0 ? <div className="p-12 text-center text-xs text-text-dim">No approval requests in this status.</div> : filtered.map((approval) => <button key={approval.id} onClick={() => navigate(`/approvals/${approval.id}`)} className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-subtle/50"><div className="flex items-start gap-3"><CheckCircle className="mt-0.5 h-4 w-4 text-accent-primary" /><div><div className="text-xs font-medium text-text-primary">{approval.requestType}</div><div className="mt-1 text-[11px] text-text-muted truncate max-w-xl">{approval.documentName}</div><div className="mt-1 text-[10px] text-text-dim">{new Date(approval.createdAt).toLocaleString()}</div></div></div><div className="flex items-center gap-3"><Badge variant={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : approval.status === 'expired' ? 'outline' : 'warning'}>{approval.status}</Badge><ChevronRight className="h-4 w-4 text-text-dim" /></div></button>)}
    </Card>
  </div>;
}
