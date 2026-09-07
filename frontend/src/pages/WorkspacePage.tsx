import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send,
  Paperclip,
  Image,
  Plus,
  FileText,
  CheckCircle2,
  Loader2,
  X,
  PanelRightClose,
  PanelRightOpen,
  Shield,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  mockConversations,
  mockMessages,
  mockTaskInfo,
  mockAgentActivity,
  mockCitations,
  mockArtifacts,
} from '@/data/mock-data';
import type { Message, AgentActivity } from '@/types/chat';
import type { AegisModel } from '@/services/models';
import { getDefaultModel } from '@/services/models';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Modal } from '@/components/ui/Modal';
import { ArtifactHash } from '@/components/blockchain/ArtifactHash';
import { ModelSelector } from '@/components/workspace/ModelSelector';

export default function WorkspacePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPrompt = searchParams.get('prompt') || '';

  const [input, setInput] = useState(initialPrompt);
  const [activeConv, setActiveConv] = useState(mockConversations[0].id);
  const [sidePanelOpen, setSidePanelOpen] = useState(true);
  const [rightTab, setRightTab] = useState<'task' | 'sources' | 'artifacts'>('task');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activities, setActivities] = useState<AgentActivity[]>(mockAgentActivity);
  const [attachedFiles, setAttachedFiles] = useState<{ id: string; name: string }[]>([]);
  const [previewArtifact, setPreviewArtifact] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AegisModel>(getDefaultModel());

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && attachedFiles.length === 0) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      attachments: attachedFiles.map((f) => ({
        id: f.id,
        name: f.name,
        type: 'document',
        size: 1200000,
      })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachedFiles([]);
    setIsGenerating(true);

    const newAct1: AgentActivity = {
      id: `act-${Date.now()}-1`,
      action: 'Task classified',
      detail: 'Technical Analysis & Compliance Verification',
      timestamp: new Date().toISOString(),
      status: 'running',
    };
    setActivities((prev) => [newAct1, ...prev]);

    setTimeout(() => {
      setActivities((prev) =>
        prev.map((a) => (a.id === newAct1.id ? { ...a, status: 'completed' } : a))
      );

      const newAct2: AgentActivity = {
        id: `act-${Date.now()}-2`,
        action: 'Knowledge indexed search',
        detail: 'Queried vector DB across OISD-105 & API-650 specifications',
        timestamp: new Date().toISOString(),
        status: 'running',
      };
      setActivities((prev) => [newAct2, ...prev]);

      setTimeout(() => {
        setActivities((prev) =>
          prev.map((a) => (a.id === newAct2.id ? { ...a, status: 'completed' } : a))
        );

        const botMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: `## Analysis & Operational Directive

Based on sovereign on-premises evaluation of internal engineering specifications and historical turnaround metrics:

### Summary of Analysis
- All reported parameters comply with baseline containment standards.
- Identified **1 critical observation** regarding wall thickness degradation requiring attention under OISD-105 regulations.
- Proposed remediation workflow queued for human sign-off.

### Regulatory Threshold Check
| Inspection Metric | Actual Measured | Allowable Threshold | Status |
|---|---|---|---|
| Column Wall Thickness | 4.2 mm | 5.0 mm min | **NON-COMPLIANT** |
| Operating Pressure | 14.8 Bar | 18.0 Bar max | **NORMAL** |
| Shell Temperature | 320 °C | 350 °C max | **NORMAL** |

### Recommended Action
Generated compliance report artifact **Inspection_Analysis_Unit4.docx** ready for cryptographic human review.`,
          timestamp: new Date().toISOString(),
          model: `${selectedModel.name} (Local)`,
          tokenCount: 612,
          latencyMs: 1800,
          citations: [
            {
              id: 'c-1',
              documentName: 'Unit4_Inspection_Report_Aug2026.pdf',
              page: 3,
              relevance: 0.96,
              snippet: 'Ultrasonic thickness test shows 4.2mm...',
            },
            {
              id: 'c-2',
              documentName: 'Safety_Manual_H2S.pdf',
              page: 37,
              relevance: 0.88,
              snippet: 'Evacuation and shutdown procedures...',
            },
          ],
          toolCalls: [
            { id: 'tc-1', name: 'DocTR OCR Extraction', status: 'completed', duration: 320 },
            { id: 'tc-2', name: 'Vector Knowledge Retrieval', status: 'completed', duration: 150 },
            { id: 'tc-3', name: 'Local Reasoning Sandbox', status: 'completed', duration: 920 },
          ],
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsGenerating(false);
      }, 900);
    }, 700);
  };

  const handleAttachSimulatedFile = () => {
    const sampleNames = ['CDU04_Vibration_Log.xlsx', 'Turnaround_SOP_Rev3.pdf', 'Pressure_Vessel_Audit.docx'];
    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    setAttachedFiles((prev) => [...prev, { id: `att-${Date.now()}`, name: randomName }]);
  };

  const currentConv = mockConversations.find((c) => c.id === activeConv);

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh)] bg-bg-primary overflow-hidden">
      {/* ── Left: Conversation History List ─────────────────── */}
      <div className="w-56 shrink-0 border-r border-border-subtle bg-bg-surface flex flex-col">
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2.5 h-12">
          <span className="text-xs font-medium text-text-primary font-mono uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={() => {
              const newId = `conv-${Date.now()}`;
              mockConversations.unshift({
                id: newId,
                title: 'New Industrial Task',
                taskType: 'Engineering Assessment',
                model: 'Mistral-7B',
                status: 'active',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messageCount: 0,
              });
              setActiveConv(newId);
              setMessages([]);
            }}
            className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
            title="Start New Task"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/40">
          {mockConversations.map((conv) => {
            const isActive = activeConv === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv.id)}
                className={cn(
                  'w-full px-3 py-2.5 text-left transition-colors relative block',
                  isActive
                    ? 'bg-bg-subtle text-text-primary'
                    : 'text-text-muted hover:bg-bg-subtle/50 hover:text-text-primary'
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent-primary rounded-r" />
                )}
                <div className="truncate text-xs font-medium text-text-primary">
                  {conv.title}
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-text-dim">
                  <span className="truncate">{conv.taskType}</span>
                  <span className="font-mono">{formatRelativeTime(conv.updatedAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Center: Chat Area ──────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0 bg-bg-primary">
        {/* Workspace Subheader */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 h-12 bg-bg-surface/50">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-xs font-medium text-text-primary truncate">
              {currentConv?.title || 'AI Workspace Session'}
            </h2>
            <Badge variant="outline" className="text-[10px] font-mono py-0 text-text-dim">
              {currentConv?.model || 'Mistral-7B Local'}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-text-dim font-mono mr-2">
              <StatusDot color="success" pulse />
              <span>Sovereign Enclave</span>
            </div>
            <button
              onClick={() => setSidePanelOpen(!sidePanelOpen)}
              className="p-1.5 text-text-muted hover:text-text-primary rounded hover:bg-bg-subtle transition-colors"
              title={sidePanelOpen ? 'Collapse side panel' : 'Expand side panel'}
            >
              {sidePanelOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto text-text-dim space-y-3">
              <div className="h-10 w-10 rounded-lg bg-bg-subtle border border-border-subtle flex items-center justify-center font-mono text-sm">
                Æ
              </div>
              <p className="text-xs">
                Sovereign AI workbench initialized. Ask questions, analyze industrial manuals, or dispatch code.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-2xl rounded-lg p-4 text-xs leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-bg-subtle border border-border-default text-text-primary'
                      : 'bg-bg-surface border border-border-subtle text-text-secondary'
                  )}
                >
                  {/* File attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {msg.attachments.map((att) => (
                        <span
                          key={att.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle text-[11px] font-mono text-text-secondary"
                        >
                          <FileText className="h-3 w-3 text-text-muted" />
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Body */}
                  <div className="space-y-2 whitespace-pre-wrap">
                    {msg.content.split('\n').map((line, i) => {
                      if (line.startsWith('## '))
                        return <div key={i} className="text-sm font-semibold text-text-primary pt-1">{line.slice(3)}</div>;
                      if (line.startsWith('### '))
                        return <div key={i} className="text-xs font-semibold text-text-primary pt-1">{line.slice(4)}</div>;
                      if (line.startsWith('- '))
                        return <li key={i} className="ml-3 list-disc text-text-secondary">{line.slice(2)}</li>;
                      if (line.startsWith('| '))
                        return <div key={i} className="font-mono text-[11px] text-text-muted bg-bg-primary/50 px-2 py-0.5 rounded border border-border-subtle/50">{line}</div>;
                      if (line.trim() === '')
                        return <div key={i} className="h-0.5" />;
                      return <p key={i}>{line}</p>;
                    })}
                  </div>

                  {/* Autonomous tool calls indicator */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-border-subtle flex flex-wrap gap-1.5">
                      {msg.toolCalls.map((tc) => (
                        <span
                          key={tc.id}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-bg-elevated text-[10px] font-mono text-text-dim border border-border-subtle"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5 text-status-success" />
                          {tc.name} ({tc.duration}ms)
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message meta */}
                  {msg.model && (
                    <div className="mt-2.5 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-dim font-mono">
                      <span>{msg.model}</span>
                      {msg.latencyMs && <span>{(msg.latencyMs / 1000).toFixed(1)}s</span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading state */}
          {isGenerating && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-bg-surface border border-border-subtle px-4 py-3 space-y-1.5 text-xs text-text-muted">
                <div className="flex items-center gap-2 text-text-secondary font-medium">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-primary" />
                  <span>Sovereign Enclave Executing...</span>
                </div>
                <p className="text-[11px] text-text-dim">
                  Evaluating locally across isolated memory space.
                </p>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Attachment preview strip */}
        {attachedFiles.length > 0 && (
          <div className="px-5 py-2 bg-bg-surface border-t border-border-subtle flex flex-wrap gap-2">
            {attachedFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded bg-bg-elevated border border-border-subtle px-2 py-0.5 text-xs text-text-secondary"
              >
                <FileText className="h-3 w-3 text-text-muted" />
                {f.name}
                <button
                  type="button"
                  onClick={() => setAttachedFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  className="text-text-dim hover:text-status-danger ml-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input composer */}
        <div className="border-t border-border-subtle p-4 bg-bg-surface">
          <form onSubmit={handleSendMessage} className="space-y-2">
            <div className="rounded-lg border border-border-default bg-bg-primary focus-within:border-border-hover transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Message AEGIS or instruct sovereign tasks..."
                rows={2}
                className="w-full resize-none bg-transparent px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-dim focus:outline-none"
              />

              <div className="flex items-center justify-between border-t border-border-subtle px-3 py-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleAttachSimulatedFile}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                  >
                    <Paperclip className="h-3 w-3" />
                    <span>Attach</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAttachSimulatedFile}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                  >
                    <Image className="h-3 w-3" />
                    <span>Drawing</span>
                  </button>
                  <div className="h-3.5 w-px bg-border-subtle mx-0.5" />
                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelectModel={setSelectedModel}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-dim font-mono hidden sm:inline">
                    Enter to send
                  </span>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isGenerating || (!input.trim() && attachedFiles.length === 0)}
                  >
                    <Send className="h-3 w-3" />
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ── Right: Collapsible Context / Sources / Artifacts Panel ── */}
      {sidePanelOpen && (
        <div className="w-72 shrink-0 border-l border-border-subtle bg-bg-surface flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border-subtle h-12 items-center px-2">
            {[
              { key: 'task', label: 'Telemetry' },
              { key: 'sources', label: 'Citations' },
              { key: 'artifacts', label: 'Artifacts' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key as typeof rightTab)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded transition-colors text-center',
                  rightTab === tab.key
                    ? 'bg-bg-subtle text-text-primary'
                    : 'text-text-dim hover:text-text-secondary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {rightTab === 'task' && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider font-mono block mb-2">
                    Active Run Telemetry
                  </span>
                  <div className="space-y-1.5 rounded-lg border border-border-subtle bg-bg-primary/50 p-2.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-text-dim">Pipeline</span>
                      <span className="text-text-secondary font-mono">{mockTaskInfo.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Engine</span>
                      <span className="text-text-secondary font-mono">{mockTaskInfo.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Runtime</span>
                      <span className="text-text-secondary font-mono">{mockTaskInfo.duration}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider font-mono block mb-2">
                    Execution Steps
                  </span>
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="rounded border border-border-subtle bg-bg-primary/30 p-2 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-text-primary text-[11px] flex items-center gap-1.5">
                            {act.status === 'completed' ? (
                              <CheckCircle2 className="h-3 w-3 text-status-success" />
                            ) : (
                              <Loader2 className="h-3 w-3 text-accent-primary animate-spin" />
                            )}
                            {act.action}
                          </span>
                          <span className="text-[10px] text-text-dim font-mono">
                            {formatRelativeTime(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted leading-relaxed">
                          {act.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {rightTab === 'sources' && (
              <div className="space-y-2.5 text-xs">
                <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider font-mono block mb-1">
                  Retrieved Sources
                </span>
                {mockCitations.map((cit) => (
                  <div
                    key={cit.id}
                    className="rounded-lg border border-border-subtle bg-bg-primary/50 p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-text-primary text-[11px] truncate flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-text-dim shrink-0" />
                        {cit.documentName}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono py-0">
                        {Math.round(cit.relevance * 100)}%
                      </Badge>
                    </div>
                    <div className="text-[10px] text-text-dim font-mono">Page {cit.page}</div>
                    <p className="text-[11px] text-text-muted italic border-l-2 border-border-default pl-2">
                      "{cit.snippet}"
                    </p>
                  </div>
                ))}
              </div>
            )}

            {rightTab === 'artifacts' && (
              <div className="space-y-2.5 text-xs">
                <span className="text-[10px] font-semibold text-text-dim uppercase tracking-wider font-mono block mb-1">
                  Synthesized Artifacts
                </span>
                {mockArtifacts.map((art) => (
                  <div
                    key={art.id}
                    className="rounded-lg border border-border-subtle bg-bg-primary/50 p-2.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 text-accent-primary shrink-0" />
                        <span className="font-medium text-text-primary text-[11px] truncate">
                          {art.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-dim">
                        {(art.size / 1024).toFixed(0)} KB
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <ArtifactHash hash={art.hash || '0x0'} length={4} />
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewArtifact(art.name)}
                          className="px-2 py-0.5 rounded text-[10px] text-text-muted hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/audit?verify=${encodeURIComponent(art.name)}`)}
                          className="px-2 py-0.5 rounded text-[10px] text-accent-primary hover:bg-bg-subtle transition-colors flex items-center gap-1"
                        >
                          <Shield className="h-2.5 w-2.5" />
                          Verify
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Artifact Preview Modal */}
      <Modal
        open={previewArtifact !== null}
        onClose={() => setPreviewArtifact(null)}
        title={previewArtifact || 'Artifact Preview'}
      >
        <div className="space-y-4 text-xs font-mono text-text-secondary">
          <div className="p-4 rounded-lg bg-bg-primary border border-border-subtle space-y-2">
            <div className="text-text-dim">// AEGIS Sovereign Cryptographic Artifact</div>
            <div className="text-text-primary font-semibold">SOVEREIGN AIR-GAP EVALUATION REPORT</div>
            <div>STATUS: ANCHORED & READY FOR OPERATOR SIGN-OFF</div>
            <div>CHECKSUM SHA-256: 0xa8f3...e912</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPreviewArtifact(null)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
