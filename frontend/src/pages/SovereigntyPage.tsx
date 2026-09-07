import { Server } from 'lucide-react';
import { mockSovereigntyMetrics, mockSystemComponents } from '@/data/mock-data';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';

export default function SovereigntyPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="System Sovereignty & Air-Gap Enclave"
        description="Physical and logical perimeter isolation metrics for on-premises workstation hardware"
        badge={
          <Badge variant="success" className="font-mono text-[10px]">
            Air-Gap Active
          </Badge>
        }
      />

      {/* Primary Isolation Banner */}
      <Card padding="md" className="border-border-default space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusDot color="success" pulse />
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Sovereignty Level: Air-Gapped High Assurance
              </span>
            </div>
            <p className="text-xs text-text-muted max-w-xl leading-relaxed">
              All neural inferencing, OCR parsing, semantic vector indexing, and cryptographic signing execute strictly on internal organizational silicon. External cloud connectivity is physically disabled.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-bg-primary border border-border-subtle shrink-0">
            <div className="text-[11px] text-text-dim font-mono">External Egress</div>
            <div className="text-sm font-semibold font-mono text-status-success">
              0 KB/s (BLOCKED)
            </div>
          </div>
        </div>

        <div className="text-[11px] text-text-dim font-mono border-t border-border-subtle pt-2.5 flex items-center gap-2">
          <span>Notice: Hardware telemetry reflects mock parameters for architectural evaluation.</span>
        </div>
      </Card>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <Card padding="md">
          <span className="text-text-dim block mb-1">Network State</span>
          <div className="font-semibold text-text-primary font-mono text-sm">
            {mockSovereigntyMetrics.networkStatus.toUpperCase()}
          </div>
          <span className="text-[10px] text-status-success font-mono">Physical Disconnect</span>
        </Card>

        <Card padding="md">
          <span className="text-text-dim block mb-1">External API Calls</span>
          <div className="font-semibold text-text-primary font-mono text-sm">
            {mockSovereigntyMetrics.externalApiCalls}
          </div>
          <span className="text-[10px] text-status-success font-mono">0 Outbound Leaks</span>
        </Card>

        <Card padding="md">
          <span className="text-text-dim block mb-1">Local AI Inferences</span>
          <div className="font-semibold text-text-primary font-mono text-sm">
            {mockSovereigntyMetrics.localAiOperations.toLocaleString()}
          </div>
          <span className="text-[10px] text-text-dim font-mono">On-Prem GPUs</span>
        </Card>

        <Card padding="md">
          <span className="text-text-dim block mb-1">Local OCR Parses</span>
          <div className="font-semibold text-text-primary font-mono text-sm">
            {mockSovereigntyMetrics.localOcrOperations.toLocaleString()}
          </div>
          <span className="text-[10px] text-text-dim font-mono">DocTR Engine</span>
        </Card>
      </div>

      {/* On-Premises Subsystem Matrix */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
          On-Premises Subsystem Matrix
        </h2>

        <Card padding="none" className="divide-y divide-border-subtle overflow-hidden">
          {mockSystemComponents.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between px-4 py-3 text-xs hover:bg-bg-subtle/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Server className="h-4 w-4 text-text-muted shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {comp.name}
                  </div>
                  <div className="text-[11px] text-text-dim truncate">
                    {comp.detail}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusDot
                  color={
                    comp.status === 'operational'
                      ? 'success'
                      : comp.status === 'warning'
                      ? 'warning'
                      : 'danger'
                  }
                />
                <span className="text-xs text-text-secondary capitalize">
                  {comp.status}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
