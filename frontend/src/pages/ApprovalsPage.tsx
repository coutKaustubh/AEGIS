import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { mockApprovals } from '@/data/mock-data';
import type { ApprovalStatus } from '@/types/approval';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ApprovalStatus | 'all'>('pending');

  const filteredApprovals = useMemo(() => {
    if (activeTab === 'all') return mockApprovals;
    return mockApprovals.filter((item) => item.status === activeTab);
  }, [activeTab]);

  const counts = useMemo(() => {
    return {
      pending: mockApprovals.filter((a) => a.status === 'pending').length,
      approved: mockApprovals.filter((a) => a.status === 'approved').length,
      rejected: mockApprovals.filter((a) => a.status === 'rejected').length,
    };
  }, []);

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'revision':
        return <Badge variant="warning">Revision Req.</Badge>;
      default:
        return <Badge variant="warning">Action Required</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Human-in-the-Loop Approvals"
        description="Mandatory sign-off queue for high-consequence AI directives and operational interventions"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            {counts.pending} Pending Review
          </Badge>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle pb-2">
        {[
          { key: 'pending', label: 'Pending', count: counts.pending },
          { key: 'approved', label: 'Approved', count: counts.approved },
          { key: 'rejected', label: 'Rejected', count: counts.rejected },
          { key: 'all', label: 'All Records', count: mockApprovals.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-bg-subtle text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span>{tab.label}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-bg-elevated text-text-dim">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <Card padding="none" className="overflow-hidden divide-y divide-border-subtle">
        {filteredApprovals.length === 0 ? (
          <div className="text-center py-12 text-xs text-text-dim">
            No approval requests in this status.
          </div>
        ) : (
          filteredApprovals.map((app) => (
            <div
              key={app.id}
              onClick={() => navigate(`/approvals/${app.id}`)}
              className="flex items-center justify-between p-4 hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="mt-0.5 shrink-0">
                  <CheckCircle className="h-4 w-4 text-text-muted group-hover:text-accent-primary transition-colors" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-xs text-text-primary group-hover:text-accent-primary truncate transition-colors">
                      {app.documentName}
                    </span>
                    {getStatusBadge(app.status)}
                  </div>
                  <p className="text-xs text-text-muted line-clamp-1">
                    {app.requestDetail}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-text-dim font-mono">
                    <span>{app.id}</span>
                    <span>•</span>
                    <span>Initiated {formatRelativeTime(app.createdAt)}</span>
                    {app.reviewer && (
                      <>
                        <span>•</span>
                        <span>Reviewed by {app.reviewer}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
