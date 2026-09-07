import { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';

export default function SettingsPage() {
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
    </div>
  );
}
