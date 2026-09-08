import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ArrowLeft,
  Bot,
  Layers,
  Search,
  ScanLine,
  Eye,
  UserCheck,
  Cpu,
  Shield,
  Network,
  ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { mockAgentExecutions } from '@/data/mock-data';
import type { AgentNode } from '@/types/agent';
import { agentService } from '@/services/agents';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

function FlowAgentNode({ data }: { data: AgentNode & { isSelected?: boolean } }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserCheck className="h-3.5 w-3.5" />;
      case 'master': return <Bot className="h-3.5 w-3.5 text-accent-primary" />;
      case 'planner': return <Layers className="h-3.5 w-3.5" />;
      case 'ocr': return <ScanLine className="h-3.5 w-3.5" />;
      case 'vision': return <Eye className="h-3.5 w-3.5" />;
      case 'rag': return <Search className="h-3.5 w-3.5" />;
      case 'reasoning': return <Cpu className="h-3.5 w-3.5 text-status-warning" />;
      case 'blockchain': return <Shield className="h-3.5 w-3.5 text-status-success" />;
      default: return <Bot className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      className={cn(
        'min-w-[190px] rounded-lg border bg-bg-surface p-3 text-xs shadow-md transition-all',
        data.isSelected ? 'border-accent-primary ring-1 ring-accent-primary' : 'border-border-default'
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-accent-primary !w-1.5 !h-1.5" />
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 font-medium text-text-primary">
          {getIcon(data.type)}
          <span>{data.name}</span>
        </div>
        <span className="text-[10px] font-mono text-text-dim">{data.duration || ''}</span>
      </div>
      <div className="text-[11px] text-text-muted truncate">{data.model || data.tool || data.type}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-accent-primary !w-1.5 !h-1.5" />
    </div>
  );
}

const nodeTypes = { custom: FlowAgentNode };

export default function AgentExecutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [viewMode, setViewMode] = useState<'timeline' | 'graph'>('timeline');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [exec, setExec] = useState(() => mockAgentExecutions[0]);
  useEffect(() => {
    if (!id) return;
    void agentService.getExecution(id).then((result) => { if (result) setExec(result); }).catch(() => undefined);
  }, [id]);

  const selectedNode = useMemo(() => {
    return exec.nodes.find((n) => n.id === selectedNodeId) || exec.nodes[0];
  }, [exec, selectedNodeId]);

  // Transform nodes for ReactFlow if graph view is toggled
  const flowNodes: Node[] = useMemo(() => {
    return exec.nodes.map((node) => ({
      id: node.id,
      type: 'custom',
      position: node.position || { x: 250, y: 100 },
      data: { ...node, isSelected: node.id === (selectedNodeId || exec.nodes[0]?.id) },
    }));
  }, [exec, selectedNodeId]);

  const flowEdges: Edge[] = useMemo(() => {
    return exec.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      animated: true,
      style: { stroke: '#334155', strokeWidth: 1.5 },
    }));
  }, [exec]);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'user': return <UserCheck className="h-3.5 w-3.5 text-text-muted" />;
      case 'master': return <Bot className="h-3.5 w-3.5 text-accent-primary" />;
      case 'ocr': return <ScanLine className="h-3.5 w-3.5 text-text-muted" />;
      case 'vision': return <Eye className="h-3.5 w-3.5 text-text-muted" />;
      case 'rag': return <Search className="h-3.5 w-3.5 text-text-muted" />;
      case 'reasoning': return <Cpu className="h-3.5 w-3.5 text-status-warning" />;
      case 'blockchain': return <Shield className="h-3.5 w-3.5 text-status-success" />;
      default: return <Layers className="h-3.5 w-3.5 text-text-muted" />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link
        to="/agents"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to Orchestrations</span>
      </Link>

      <PageHeader
        title={exec.taskTitle}
        description={`Pipeline ${exec.id} · Type: ${exec.taskType} · Runtime: ${exec.duration}`}
        badge={
          <Badge variant={exec.status === 'completed' ? 'success' : 'info'}>
            {exec.status.toUpperCase()}
          </Badge>
        }
        actions={
          <div className="flex items-center rounded-md border border-border-default bg-bg-surface p-0.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors',
                viewMode === 'timeline'
                  ? 'bg-bg-subtle text-text-primary'
                  : 'text-text-dim hover:text-text-secondary'
              )}
            >
              <ListOrdered className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors',
                viewMode === 'graph'
                  ? 'bg-bg-subtle text-text-primary'
                  : 'text-text-dim hover:text-text-secondary'
              )}
            >
              <Network className="h-3.5 w-3.5" />
              <span>DAG Graph</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Timeline or Graph View */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'timeline' ? (
            <Card padding="md" className="space-y-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono mb-2">
                Execution Steps Flow
              </div>

              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-px bg-border-subtle" />

                {exec.nodes.map((node) => {
                  const isSelected = (selectedNodeId || exec.nodes[0].id) === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className="relative group cursor-pointer transition-all"
                    >
                      <div
                        className={cn(
                          'absolute -left-6 top-1 h-5 w-5 rounded-full flex items-center justify-center border text-[10px] transition-colors',
                          isSelected
                            ? 'bg-accent-primary text-white border-accent-primary'
                            : 'bg-bg-surface border-border-default text-text-muted group-hover:border-border-hover'
                        )}
                      >
                        {getNodeIcon(node.type)}
                      </div>

                      <div
                        className={cn(
                          'p-3 rounded-lg border text-xs transition-colors',
                          isSelected
                            ? 'bg-bg-subtle border-border-hover'
                            : 'bg-bg-surface/60 border-border-subtle hover:border-border-default'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary">{node.name}</span>
                          <span className="text-[11px] font-mono text-text-dim">{node.duration}</span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5 flex items-center gap-2">
                          <span>Role: {node.type}</span>
                          {node.model && <span>• Model: {node.model}</span>}
                          {node.tool && <span>• Tool: {node.tool}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card padding="none" className="h-[480px] overflow-hidden border-border-default">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                fitView
                className="bg-bg-primary"
              >
                <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#27272a" />
                <Controls className="!bg-bg-surface !border-border-default !text-text-primary fill-current" />
              </ReactFlow>
            </Card>
          )}
        </div>

        {/* Right Col: Node Inspector Card */}
        <div className="space-y-4">
          <Card padding="md" className="space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                Node Telemetry
              </span>
              <Badge variant="outline" className="text-[10px] font-mono">
                {selectedNode.status.toUpperCase()}
              </Badge>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-text-dim block mb-0.5">Node Name</span>
                <span className="font-medium text-text-primary">{selectedNode.name}</span>
              </div>
              <div>
                <span className="text-text-dim block mb-0.5">Assigned Engine / Tool</span>
                <span className="font-mono text-text-secondary">
                  {selectedNode.model || selectedNode.tool || 'Autonomous Dispatch'}
                </span>
              </div>
              <div>
                <span className="text-text-dim block mb-0.5">Latency</span>
                <span className="font-mono text-text-secondary">{selectedNode.duration || 'N/A'}</span>
              </div>
            </div>

            {selectedNode.detail && (
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-[11px] text-text-dim block mb-1 font-mono">Execution Log / Detail</span>
                <div className="p-2.5 rounded bg-bg-primary border border-border-subtle font-mono text-[11px] text-text-muted whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {selectedNode.detail}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
