import { useState } from 'react';
import { CheckCircle2, Save, Check } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { themes, type ThemeId } from '@/theme/themes';
import { useTheme } from '@/theme/useTheme';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings State
  const [orgName, setOrgName] = useState('Bharat Petroleum Corporation Limited (BPCL)');
  const [refineryId, setRefineryId] = useState('REFINERY-UNIT-MUMBAI-04');
  const [defaultModel, setDefaultModel] = useState('Mistral-7B-Instruct-v0.2');
  const [maxTokens, setMaxTokens] = useState('4096');
  const [contextWindow, setContextWindow] = useState('32768');
  const [embeddingModel, setEmbeddingModel] = useState('bge-large-en-v1.5 (Local)');
  const [chunkSize, setChunkSize] = useState('512');
  const [networkName, setNetworkName] = useState('AEGIS Sovereign Consortium (L2)');
  const [chainId, setChainId] = useState('1337');
  const [rpcUrl, setRpcUrl] = useState('http://127.0.0.1:8545');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings & Configuration"
        description="Local runtime parameters, sovereign inference engines, and private blockchain ledger hooks"
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
          >
            {savedSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-status-success" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            <span>{savedSuccess ? 'Saved' : 'Save Changes'}</span>
          </Button>
        }
      />

      <Tabs
        tabs={[
          {
            key: 'general',
            label: 'General & Facility',
            content: (
              <Card padding="md" className="space-y-4 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                  Operational Identity
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organization / PSU Entity"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                  <Input
                    label="Facility / Refinery Node ID"
                    value={refineryId}
                    onChange={(e) => setRefineryId(e.target.value)}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'ai',
            label: 'AI & Inference Engine',
            content: (
              <Card padding="md" className="space-y-4 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                  On-Premises Neural Architecture
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Active Local Foundation Model"
                    value={defaultModel}
                    onChange={(e) => setDefaultModel(e.target.value)}
                  />
                  <Input
                    label="Max Generation Tokens"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                  />
                  <Input
                    label="Context Window Limit"
                    value={contextWindow}
                    onChange={(e) => setContextWindow(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Inference Backend
                    </label>
                    <div className="px-3 py-2 rounded-md bg-bg-primary border border-border-default text-xs font-mono text-text-secondary">
                      llama.cpp (vulkan/cuda local)
                    </div>
                  </div>
                </div>
              </Card>
            ),
          },
          {
            key: 'knowledge',
            label: 'Knowledge & Vectors',
            content: (
              <Card padding="md" className="space-y-4 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                  Vector Retrieval Parameters
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Local Embedding Model"
                    value={embeddingModel}
                    onChange={(e) => setEmbeddingModel(e.target.value)}
                  />
                  <Input
                    label="Chunk Size (Tokens)"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                  />
                </div>
              </Card>
            ),
          },
          {
            key: 'blockchain',
            label: 'Ledger & Audit',
            content: (
              <Card padding="md" className="space-y-4 pt-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
                  Proof-of-Authority Consortium Node
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ledger Network Name"
                    value={networkName}
                    onChange={(e) => setNetworkName(e.target.value)}
                  />
                  <Input
                    label="Chain ID"
                    value={chainId}
                    onChange={(e) => setChainId(e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <Input
                      label="Local RPC Node Endpoint"
                      value={rpcUrl}
                      onChange={(e) => setRpcUrl(e.target.value)}
                    />
                  </div>
                </div>
              </Card>
            ),
          },
        ]}
      />

      <Card padding="md" className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">
            Theme Preview
          </div>
          <p className="mt-1 text-xs text-text-secondary">Choose your preferred AEGIS appearance. Changes apply immediately and persist on this device.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {themes.map((option) => (
            <ThemePreviewCard
              key={option.id}
              id={option.id}
              name={option.name}
              description={option.description}
              selected={theme === option.id}
              onSelect={() => setTheme(option.id)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function ThemePreviewCard({
  id,
  name,
  description,
  selected,
  onSelect,
}: {
  id: ThemeId;
  name: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`group rounded-lg border p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary ${selected ? 'border-accent-primary bg-accent-primary/10' : 'border-border-subtle hover:border-border-default'}`}
    >
      <div data-theme={id} className="overflow-hidden rounded-md border border-border-default bg-bg-primary text-text-primary">
        <div className="flex h-20 items-center gap-2 p-3">
          <span className="text-2xl font-semibold tracking-tight">Aa</span>
          <div className="flex-1 rounded border border-border-default bg-bg-surface p-2">
            <div className="h-1.5 w-3/4 rounded bg-text-primary/70" />
            <div className="mt-2 h-1.5 w-1/2 rounded bg-text-secondary/60" />
            <div className="mt-3 h-1.5 w-1/3 rounded bg-accent-primary" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-primary">{name}</span>
        {selected && <Check className="h-3.5 w-3.5 text-accent-primary" aria-label="Selected" />}
      </div>
      <span className="mt-1 block text-[10px] text-text-dim">{description}</span>
    </button>
  );
}
