import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import type { AITaskRecord } from '@/services/chats';
import { approvalService } from '@/services/approvals';
import { documentService } from '@/services/documents';
import { loadModels } from '@/services/models';
import { systemService, type SystemHealthResponse } from '@/services/system';
import { apiClient } from '@/services/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatusDot } from '@/components/ui/StatusDot';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/context/AuthContext';

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 first:pl-0 last:pr-0 sm:px-5">
      <div className="text-[11px] font-mono uppercase tracking-wider text-text-dim">{label}</div>
      <div className="mt-2 text-2xl font-medium tracking-tight text-text-primary">{value}</div>
    </div>
  );
}

function SnapshotStatus({ label, active, activeLabel }: { label: string; active: boolean | undefined; activeLabel: string }) {
  const state = active === undefined ? 'Not reported' : active ? activeLabel : 'Unavailable';
  const color = active === undefined ? 'neutral' : active ? 'success' : 'warning';
  return (
    <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-text-muted">
      <StatusDot color={color} />
      {label} {state}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AITaskRecord[]>([]);
  const [documentsIndexed, setDocumentsIndexed] = useState<number>();
  const [pendingApprovals, setPendingApprovals] = useState<number>();
  const [modelsConfigured, setModelsConfigured] = useState<number>();
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string>();
  const [tasksLoaded, setTasksLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    void Promise.allSettled([
      apiClient.get<AITaskRecord[]>('/chats/tasks/'),
      documentService.list(),
      approvalService.list('pending'),
      systemService.health(),
      loadModels(),
    ]).then(([taskResult, documentResult, approvalResult, healthResult, modelResult]) => {
      if (!mounted) return;
      if (taskResult.status === 'fulfilled') {
        setTasks(taskResult.value);
        setTasksLoaded(true);
      }
      if (documentResult.status === 'fulfilled') {
        setDocumentsIndexed(documentResult.value.filter((document) => document.status === 'indexed').length);
      }
      if (approvalResult.status === 'fulfilled') setPendingApprovals(approvalResult.value.length);
      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
        setHealthCheckedAt(new Date().toISOString());
      }
      if (modelResult.status === 'fulfilled') setModelsConfigured(modelResult.value.length);
    });
    return () => { mounted = false; };
  }, []);

  const activeTasks = tasks.filter((task) => task.status === 'queued' || task.status === 'running').length;
  const systemOperational = health
    ? health.django === 'ok' && health.database === 'ok' && health.ai_service === 'ok'
    : undefined;
  const localAi = health ? health.ai_service === 'ok' && health.network_policy === 'local_only' : undefined;
  const airGapped = health ? health.network_policy === 'local_only' : undefined;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.split(' ')[0] || 'Operator';

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description="Air-gapped node · Sovereign hardware"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            Node-01 · Operational
          </Badge>
        }
      />

      <section aria-labelledby="key-metrics-heading">
        <h2 id="key-metrics-heading" className="mb-4 text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Key Metrics</h2>
        <div className="grid grid-cols-2 divide-x divide-border-subtle border-y border-border-subtle sm:grid-cols-4">
          <Metric label="Active AI Tasks" value={tasksLoaded ? String(activeTasks).padStart(2, '0') : '—'} />
          <Metric label="Documents Indexed" value={documentsIndexed === undefined ? '—' : documentsIndexed.toLocaleString()} />
          <Metric label="Pending Approvals" value={pendingApprovals === undefined ? '—' : String(pendingApprovals).padStart(2, '0')} />
          <Metric label="GPU Utilization" value="—" />
        </div>
      </section>

      <section aria-labelledby="system-heading" className="border-y border-border-subtle py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="system-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">System</h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <SnapshotStatus label="" active={systemOperational} activeLabel="Operational" />
            <SnapshotStatus label="" active={localAi} activeLabel="Local AI" />
            <SnapshotStatus label="" active={airGapped} activeLabel="Air-gapped / Local" />
          </div>
        </div>
      </section>

      <section aria-labelledby="environment-heading" className="max-w-xl">
        <h2 id="environment-heading" className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Environment</h2>
        <div className="border-y border-border-subtle">
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-3">
            <span className="text-xs text-text-secondary">Node</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">Node-01</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-3">
            <span className="text-xs text-text-secondary">Network</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">{airGapped ? 'Air-gapped / Local' : health?.network_policy || 'Not reported'}</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border-subtle py-3">
            <span className="text-xs text-text-secondary">Models</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">{modelsConfigured === undefined ? 'Not reported' : `${modelsConfigured} configured`}</span>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-xs text-text-secondary">Last health check</span>
            <span className="text-[11px] font-mono text-text-dim">{healthCheckedAt ? formatRelativeTime(healthCheckedAt) : 'Not reported'}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
