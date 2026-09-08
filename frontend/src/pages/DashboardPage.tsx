import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Image,
  Code,
  ArrowRight,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import type { AITaskRecord } from '@/services/chats';
import { approvalService } from '@/services/approvals';
import { documentService } from '@/services/documents';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [taskPrompt, setTaskPrompt] = useState('');
  const [tasks, setTasks] = useState<AITaskRecord[]>([]);
  const [metrics, setMetrics] = useState({ active: 0, documents: 0, approvals: 0 });

  useEffect(() => {
    void Promise.all([
      import('@/services/api').then(({ apiClient }) => apiClient.get<AITaskRecord[]>('/chats/tasks/')),
      documentService.list(),
      approvalService.list('pending'),
    ]).then(([loadedTasks, documents, pending]) => {
      setTasks(loadedTasks);
      setMetrics({ active: loadedTasks.filter((task) => task.status === 'queued' || task.status === 'running').length, documents: documents.length, approvals: pending.length });
    }).catch(() => undefined);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Operator';

  const handleStartTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskPrompt.trim()) {
      navigate(`/workspace?prompt=${encodeURIComponent(taskPrompt)}`);
    } else {
      navigate('/workspace');
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <StatusDot color="success" />;
      case 'running':
      case 'queued':
        return <StatusDot color="info" pulse />;
      case 'failed':
        return <StatusDot color="danger" />;
      default:
        return <StatusDot color="neutral" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Header */}
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Air-gapped node active · All executions contained on sovereign hardware"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            Node-01 · PoA Secured
          </Badge>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/workspace')}
          >
            Open AI Workspace
          </Button>
        }
      />

      {/* 3 Inline High-Level Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted">Active AI Tasks</div>
            <div className="text-2xl font-medium tracking-tight text-text-primary mt-1">
              {metrics.active}
            </div>
          </div>
          <Activity className="h-5 w-5 text-accent-primary opacity-80" />
        </Card>

        <Card padding="md" className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted">Documents Indexed</div>
            <div className="text-2xl font-medium tracking-tight text-text-primary mt-1">
              {metrics.documents.toLocaleString()}
            </div>
          </div>
          <FileText className="h-5 w-5 text-text-muted" />
        </Card>

        <Card padding="md" className="flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted">Pending Approvals</div>
            <div className="text-2xl font-medium tracking-tight text-text-primary mt-1">
              {metrics.approvals}
            </div>
          </div>
          <Badge variant="warning" className="text-xs">
            Action Req.
          </Badge>
        </Card>
      </div>

      {/* Direct Task Execution Prompt Bar */}
      <Card padding="md" className="space-y-3">
        <div className="text-xs font-medium text-text-primary">
          Dispatch Sovereign Task
        </div>
        <form onSubmit={handleStartTask} className="flex gap-2">
          <input
            type="text"
            value={taskPrompt}
            onChange={(e) => setTaskPrompt(e.target.value)}
            placeholder="Type task or query: e.g. Analyze distillation column report or verify emergency SOP..."
            className="flex-1 rounded-md border border-border-default bg-bg-surface px-3 py-2 text-xs text-text-primary placeholder:text-text-dim focus:border-border-hover focus:outline-none transition-colors"
          />
          <Button type="submit" variant="primary" size="md">
            <span>Execute</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-text-dim font-mono mr-1">Suggested:</span>
          {[
            { label: 'Analyze Document', icon: FileText, prompt: 'Analyze the attached refinery inspection report for corrosion compliance.' },
            { label: 'Search SOPs', icon: Search, prompt: 'Search internal SOPs and manuals for emergency shutdown procedures.' },
            { label: 'Inspect P&ID Drawing', icon: Image, prompt: 'Perform vision inspection on this engineering drawing P&ID.' },
            { label: 'Compute Pressure Drop', icon: Code, prompt: 'Calculate pipeline hydraulic pressure drop using Darcy-Weisbach equation.' },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => navigate(`/workspace?prompt=${encodeURIComponent(item.prompt)}`)}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-text-muted hover:text-text-primary bg-bg-subtle/50 hover:bg-bg-subtle border border-border-subtle transition-colors"
            >
              <item.icon className="h-3 w-3 text-text-dim" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent Tasks & Orchestrations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
            Recent Task Orchestrations
          </h2>
          <Link
            to="/agents"
            className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
          >
            View all executions <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Card padding="none" className="divide-y divide-border-subtle overflow-hidden">
          {tasks.slice(0, 6).map((task) => (
            <Link
              key={task.id}
              to={`/agents/${task.id}`}
              className="flex items-center gap-3.5 px-4 py-3 hover:bg-bg-subtle/50 transition-colors group"
            >
              <div className="shrink-0">{getStatusIndicator(task.status)}</div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-xs font-medium text-text-primary group-hover:text-accent-primary transition-colors">
                  {task.request_text}
                </div>
                <div className="text-[11px] text-text-dim flex items-center gap-2 mt-0.5">
                  <span>AI task</span>
                  <span>·</span>
                  <span className="font-mono">{task.model_used || 'automatic'}</span>
                </div>
              </div>
              <div className="text-[11px] text-text-dim whitespace-nowrap font-mono">
                {formatRelativeTime(task.created_at)}
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-text-dim group-hover:text-text-secondary transition-colors" />
            </Link>
          ))}
          {tasks.length === 0 && <div className="p-8 text-center text-xs text-text-dim">No tasks have been executed yet.</div>}
        </Card>
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <Link
          to="/documents"
          className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-default hover:bg-bg-subtle/30 transition-colors group"
        >
          <div className="text-xs font-medium text-text-primary group-hover:text-accent-primary transition-colors flex items-center justify-between">
            <span>Classified Documents</span>
            <ChevronRight className="h-3 w-3 text-text-dim" />
          </div>
          <p className="text-[11px] text-text-dim mt-1">
            Access, upload, and inspect verified operational manuals and reports.
          </p>
        </Link>

        <Link
          to="/approvals"
          className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-default hover:bg-bg-subtle/30 transition-colors group"
        >
          <div className="text-xs font-medium text-text-primary group-hover:text-accent-primary transition-colors flex items-center justify-between">
            <span>Human-in-the-Loop</span>
            <ChevronRight className="h-3 w-3 text-text-dim" />
          </div>
          <p className="text-[11px] text-text-dim mt-1">
            Review and sign off on high-consequence AI suggestions and code.
          </p>
        </Link>

        <Link
          to="/audit"
          className="p-3.5 rounded-lg border border-border-subtle bg-bg-surface hover:border-border-default hover:bg-bg-subtle/30 transition-colors group"
        >
          <div className="text-xs font-medium text-text-primary group-hover:text-accent-primary transition-colors flex items-center justify-between">
            <span>Audit & Provenance</span>
            <ChevronRight className="h-3 w-3 text-text-dim" />
          </div>
          <p className="text-[11px] text-text-dim mt-1">
            Inspect cryptographic proof chains and verify artifact authenticity.
          </p>
        </Link>
      </div>
    </div>
  );
}
