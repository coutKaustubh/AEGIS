import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  ChevronRight,
  Search,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import { mockAgentExecutions } from '@/data/mock-data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function AgentsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredExecutions = useMemo(() => {
    return mockAgentExecutions.filter((exec) => {
      const matchesSearch =
        exec.taskTitle.toLowerCase().includes(search.toLowerCase()) ||
        exec.taskType.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || exec.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'running':
        return <Badge variant="info">Running</Badge>;
      case 'failed':
        return <Badge variant="danger">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Agent Orchestrations"
        description="Autonomous multi-agent execution traces, step latencies, and tool delegation"
        badge={
          <Badge variant="outline" className="font-mono text-[10px] text-text-dim">
            {mockAgentExecutions.length} Pipelines
          </Badge>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search execution traces by title or pipeline type..."
            className="w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border-default bg-bg-surface px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Orchestrations List */}
      <Card padding="none" className="overflow-hidden divide-y divide-border-subtle">
        <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-surface/60 text-[11px] font-mono text-text-dim uppercase tracking-wider">
          <div className="col-span-6 sm:col-span-5">Execution Title</div>
          <div className="col-span-3 sm:col-span-2">Status</div>
          <div className="col-span-3 sm:col-span-2 hidden sm:block">Pipeline Type</div>
          <div className="col-span-3 sm:col-span-2 hidden sm:block">Nodes / Time</div>
          <div className="col-span-3 sm:col-span-1 text-right">Details</div>
        </div>

        {filteredExecutions.length === 0 ? (
          <div className="text-center py-12 text-xs text-text-dim">
            No agent executions match your filter.
          </div>
        ) : (
          filteredExecutions.map((exec) => (
            <div
              key={exec.id}
              onClick={() => navigate(`/agents/${exec.id}`)}
              className="grid grid-cols-12 items-center px-4 py-3.5 text-xs hover:bg-bg-subtle/50 transition-colors cursor-pointer group"
            >
              <div className="col-span-6 sm:col-span-5 flex items-center gap-3 min-w-0 pr-2">
                <Bot className="h-4 w-4 text-text-dim group-hover:text-accent-primary shrink-0 transition-colors" />
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                    {exec.taskTitle}
                  </div>
                  <div className="text-[11px] text-text-dim font-mono truncate">
                    {exec.id} · Initiated {formatRelativeTime(exec.startedAt)}
                  </div>
                </div>
              </div>

              <div className="col-span-3 sm:col-span-2">
                {getStatusBadge(exec.status)}
              </div>

              <div className="col-span-3 sm:col-span-2 hidden sm:block text-text-secondary truncate">
                {exec.taskType}
              </div>

              <div className="col-span-3 sm:col-span-2 hidden sm:block text-text-dim font-mono text-[11px]">
                {exec.nodes.length} nodes · {exec.duration}
              </div>

              <div className="col-span-3 sm:col-span-1 flex items-center justify-end">
                <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-text-primary transition-colors" />
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
