import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StatusDot } from '@/components/ui/StatusDot';
import { systemService, type SystemHealthResponse } from '@/services/system';

export default function SovereigntyPage() {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  useEffect(() => { void systemService.health().then(setHealth).catch(() => undefined); }, []);
  const aiModels = health?.ai_detail?.models || {};
  const components = [
    { id: 'django', name: 'Django API', status: health?.django === 'ok' ? 'operational' : 'warning', detail: health?.django || 'checking' },
    { id: 'database', name: 'Database', status: health?.database === 'ok' ? 'operational' : 'warning', detail: health?.database || 'checking' },
    { id: 'ai', name: 'Local AI Service', status: health?.ai_service === 'ok' ? 'operational' : 'warning', detail: health?.ai_service || 'checking' },
    { id: 'network', name: 'Network Policy', status: health?.network_policy === 'local_only' ? 'operational' : 'warning', detail: health?.network_policy || 'checking' },
  ] as const;
  return <div className="max-w-5xl mx-auto space-y-6"><PageHeader title="System Sovereignty & Air-Gap Enclave" description="Live health and local execution status" badge={<Badge variant={health?.ai_service === 'ok' ? 'success' : 'warning'}>{health?.ai_service === 'ok' ? 'Operational' : 'Checking'}</Badge>} /><Card padding="md" className="space-y-4"><div className="flex items-center gap-2"><StatusDot color={health?.network_policy === 'local_only' ? 'success' : 'warning'} pulse /><span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">{health?.network_policy === 'local_only' ? 'Local-only policy active' : 'Network policy unavailable'}</span></div><p className="text-xs text-text-muted">The dashboard reports the actual Django, database and local AI service health. Per-task network totals are available in the Workspace Network tab.</p></Card><div className="grid grid-cols-2 sm:grid-cols-4 gap-3"><Card padding="md"><span className="text-text-dim block mb-1">External API calls</span><div className="font-semibold text-text-primary font-mono text-sm">Per task</div></Card><Card padding="md"><span className="text-text-dim block mb-1">Local model profiles</span><div className="font-semibold text-text-primary font-mono text-sm">{Object.keys(aiModels).length}</div></Card><Card padding="md"><span className="text-text-dim block mb-1">Available models</span><div className="font-semibold text-text-primary font-mono text-sm">{Object.values(aiModels).filter(Boolean).length}</div></Card><Card padding="md"><span className="text-text-dim block mb-1">Network policy</span><div className="font-semibold text-text-primary font-mono text-sm">{health?.network_policy || '—'}</div></Card></div><Card padding="none" className="divide-y divide-border-subtle overflow-hidden">{components.map((component) => <div key={component.id} className="flex items-center justify-between px-4 py-3 text-xs"><div className="flex items-center gap-3"><Server className="h-4 w-4 text-text-muted" /><div><div className="font-medium text-text-primary">{component.name}</div><div className="text-[11px] text-text-dim">{component.detail}</div></div></div><div className="flex items-center gap-2"><StatusDot color={component.status === 'operational' ? 'success' : 'warning'} /><span className="capitalize text-text-secondary">{component.status}</span></div></div>)}</Card></div>;
}
