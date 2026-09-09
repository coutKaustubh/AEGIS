import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Send,
  Shield,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ModelSelector } from '@/components/workspace/ModelSelector';
import { useAuth } from '@/context/AuthContext';
import { chatService, type AITaskRecord, type ArtifactRecord, type ChatMessageRecord, type ChatSessionRecord, type PermissionRecord } from '@/services/chats';
import { type AegisModel, getDefaultModel } from '@/services/models';
import type { AgentActivity, GeneratedArtifact, Message } from '@/types/chat';

function toMessage(message: ChatMessageRecord): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.created_at,
    model: typeof message.metadata?.model === 'string' ? message.metadata.model : undefined,
  };
}

function modelRole(model: AegisModel): string {
  if (model.id === 'aegis-vision') return 'qwen-vision';
  if (model.id === 'aegis-code') return 'qwen-coder';
  if (model.id === 'aegis-fast') return 'llama-small';
  return 'qwen-general';
}

function eventPayload(event: Record<string, unknown>): Record<string, unknown> {
  const metadata = event.metadata;
  if (metadata && typeof metadata === 'object' && 'ai_event' in metadata) {
    const nested = (metadata as { ai_event?: unknown }).ai_event;
    if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  }
  return event;
}

function toGeneratedArtifact(artifact: ArtifactRecord): GeneratedArtifact {
  return {
    id: artifact.id,
    name: artifact.name,
    type: (artifact.artifact_type === 'md' ? 'markdown' : artifact.artifact_type) as GeneratedArtifact['type'],
    size: Number(artifact.metadata?.size_bytes || 0),
    hash: artifact.sha256,
    downloadUrl: artifact.download_url,
  };
}

export default function WorkspacePage() {
  const [searchParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const initialPrompt = searchParams.get('prompt') || '';
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSessionRecord | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState<AegisModel>(getDefaultModel());
  const [task, setTask] = useState<AITaskRecord | null>(null);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [network, setNetwork] = useState<Record<string, unknown>>({});
  const [rightTab, setRightTab] = useState<'telemetry' | 'network' | 'artifacts'>('telemetry');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [approvalBusy, setApprovalBusy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadSession = async (session: ChatSessionRecord) => {
    setActiveSession(session);
    setError('');
    try {
      const detail = await chatService.getSession(session.id);
      const hydratedMessages = await Promise.all((detail.chats || []).map(async (chat) => {
        const message = toMessage(chat);
        const taskId = typeof chat.metadata?.ai_task_id === 'string' ? chat.metadata.ai_task_id : '';
        if (chat.role === 'assistant' && taskId) {
          try {
            message.artifacts = (await chatService.getArtifacts(taskId)).map(toGeneratedArtifact);
          } catch {
            // The chat remains readable even when an old artifact was removed.
          }
        }
        return message;
      }));
      setMessages(hydratedMessages);
      setSessions((current) => current.map((item) => item.id === detail.id ? detail : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load conversation.');
    }
  };

  const refreshTaskData = async (taskId: string) => {
    const [nextTask, nextArtifacts, nextNetwork, nextPermissions] = await Promise.all([
      chatService.getTask(taskId),
      chatService.getArtifacts(taskId),
      chatService.getNetwork(taskId),
      chatService.getPermissions(taskId),
    ]);
    setTask(nextTask);
    setArtifacts(nextArtifacts);
    setNetwork(nextNetwork);
    setPermissions(nextPermissions);
    // A queued/running task has no final answer yet.  In particular, never
    // render a response_text value while polling because it can be stale or
    // belong to a previous failed attempt.
    if (['success', 'failed', 'cancelled'].includes(nextTask.status) && nextTask.response_text) {
      const generatedArtifacts = nextArtifacts.map(toGeneratedArtifact);
      setMessages((current) => {
        const message = {
          id: `assistant-${taskId}`,
          role: 'assistant' as const,
          content: nextTask.response_text,
          timestamp: nextTask.updated_at,
          model: nextTask.model_used || undefined,
          artifacts: generatedArtifacts,
        };
        const existing = current.findIndex((item) => item.id === message.id);
        if (existing < 0) return [...current, message];
        const updated = [...current];
        updated[existing] = { ...updated[existing], ...message };
        return updated;
      });
    }
    return nextTask;
  };

  useEffect(() => {
    let mounted = true;
    chatService.listSessions().then(async (items) => {
      if (!mounted) return;
      setSessions(items);
      if (items[0]) await loadSession(items[0]);
    }).catch((cause) => {
      if (mounted) setError(cause instanceof Error ? cause.message : 'Unable to connect to backend.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      abortRef.current?.abort();
    };
  }, []);

  const createSession = async () => {
    try {
      const session = await chatService.createSession();
      setSessions((current) => [session, ...current]);
      await loadSession(session);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create conversation.');
    }
  };

  const handleFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(Array.from(event.target.files || []));
    event.target.value = '';
  };

  const addActivity = (event: Record<string, unknown>) => {
    const payload = eventPayload(event);
    const type = String(payload.type || payload.event || event.event || 'progress');
    const status: AgentActivity['status'] = /failed|error|blocked/i.test(type) ? 'pending' : 'completed';
    const detail = String(payload.message || payload.action || payload.tool || type.replaceAll('_', ' '));
    setActivities((current) => [{
      id: `${type}-${Date.now()}-${Math.random()}`,
      action: type.replaceAll('_', ' '),
      detail,
      timestamp: new Date().toISOString(),
      status,
    }, ...current].slice(0, 60));
  };

  const sendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if ((!input.trim() && files.length === 0) || sending) return;
    setSending(true);
    setError('');
    setActivities([]);
    const text = input.trim() || `Please inspect the attached file${files.length > 1 ? 's' : ''}.`;
    const selectedFiles = files;
    setMessages((current) => [...current, {
      id: `local-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      attachments: selectedFiles.map((file, index) => ({
        id: `${file.name}-${index}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: file.size,
      })),
    }]);
    setInput('');
    setFiles([]);
    try {
      const created = await chatService.ask(text, activeSession?.id, selectedFiles, {
        model_role: modelRole(selectedModel),
        model_label: selectedModel.name,
      });
      if (!activeSession || activeSession.id !== created.chat_session_id) {
        const session = await chatService.getSession(created.chat_session_id);
        setActiveSession(session);
        setSessions((current) => current.some((item) => item.id === session.id)
          ? current.map((item) => item.id === session.id ? session : item)
          : [session, ...current]);
      }
      setTask(created.task);
      addActivity({ type: 'task_queued', message: 'Task queued in the AEGIS backend.' });
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      await chatService.streamEvents(created.task.id, (streamEvent) => {
        if (streamEvent.task_id && String(streamEvent.task_id) !== created.task.id) return;
        addActivity(streamEvent);
        const payload = eventPayload(streamEvent);
        const eventType = String(payload.type || payload.event || streamEvent.event || '');
        const metadata = streamEvent.metadata;
        if (eventType === 'assistant_message_created' && metadata && typeof metadata === 'object') {
          const content = (metadata as { content?: unknown }).content;
          const status = String((metadata as { status?: unknown }).status || '');
          if (['success', 'failed', 'cancelled'].includes(status) && typeof content === 'string' && content) {
            setMessages((current) => current.some((item) => item.id === `assistant-${created.task.id}`)
              ? current
              : [...current, { id: `assistant-${created.task.id}`, role: 'assistant', content, timestamp: new Date().toISOString(), model: created.task.model_used || undefined }]);
          }
        }
        if (String(payload.type || payload.event || streamEvent.event) === 'approval_required') {
          void chatService.getPermissions(created.task.id).then(setPermissions).catch(() => undefined);
        }
      }, controller.signal);
      await refreshTaskData(created.task.id);
    } catch (cause) {
      if ((cause as Error)?.name !== 'AbortError') {
        setError(cause instanceof Error ? cause.message : 'The AI task could not be completed.');
      }
    } finally {
      setSending(false);
    }
  };

  const decidePermission = async (permission: PermissionRecord, decision: 'approve' | 'deny') => {
    if (!task || approvalBusy) return;
    setApprovalBusy(permission.request_id);
    try {
      const updated = await chatService.decidePermission(task.id, permission.request_id, decision);
      setPermissions((current) => current.map((item) => item.request_id === updated.request_id ? updated : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Permission decision failed.');
    } finally {
      setApprovalBusy(null);
    }
  };

  const downloadArtifact = async (artifact: ArtifactRecord) => {
    await downloadFile(artifact.download_url, artifact.name, setError);
  };

  const downloadMessageArtifact = async (artifact: GeneratedArtifact) => {
    await downloadFile(artifact.downloadUrl, artifact.name, setError);
  };

  const downloadFile = async (downloadUrl: string | undefined, name: string, reportError: (message: string) => void) => {
    if (!downloadUrl) {
      reportError(`No download URL is available for ${name}.`);
      return;
    }
    try {
      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${localStorage.getItem('aegis_access_token') || ''}` },
      });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      reportError(cause instanceof Error ? cause.message : 'Artifact download failed.');
    }
  };

  const pendingPermission = permissions.find((permission) => permission.status === 'pending');

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh)] bg-bg-primary overflow-hidden">
      <aside className="w-60 shrink-0 border-r border-border-subtle bg-bg-surface flex flex-col">
        <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2.5 h-12">
          <span className="text-xs font-medium text-text-primary font-mono uppercase tracking-wider">Conversations</span>
          <button onClick={() => void createSession()} className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-subtle" title="Start new task">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border-subtle/40">
          {sessions.map((session) => (
            <button key={session.id} onClick={() => void loadSession(session)} className={cn('w-full px-3 py-3 text-left', activeSession?.id === session.id ? 'bg-bg-subtle' : 'hover:bg-bg-subtle/50')}>
              <div className="truncate text-xs font-medium text-text-primary">{session.chat_title}</div>
              <div className="mt-1 text-[10px] text-text-dim">{new Date(session.updated_at).toLocaleString()}</div>
            </button>
          ))}
          {!loading && sessions.length === 0 && <div className="p-4 text-xs text-text-dim">No conversations yet.</div>}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="h-12 shrink-0 border-b border-border-subtle px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Shield className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-text-secondary truncate">{activeSession?.chat_title || 'AEGIS Workspace'}</span>
          </div>
          {task && <Badge variant={task.status === 'success' ? 'success' : task.status === 'failed' ? 'danger' : 'warning'}>{task.status}</Badge>}
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {error && <div className="flex items-start gap-2 rounded border border-status-danger/30 bg-status-danger/10 p-3 text-xs text-status-danger"><AlertTriangle className="h-4 w-4 shrink-0" />{error}<button className="ml-auto" onClick={() => setError('')}><X className="h-3 w-3" /></button></div>}
          {messages.map((message) => (
            <div key={message.id} className={cn('max-w-3xl rounded-lg border p-4', message.role === 'user' ? 'ml-auto border-accent-primary/20 bg-accent-primary/5' : 'border-border-subtle bg-bg-surface')}>
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-dim font-mono"><span>{message.role === 'user' ? 'You' : 'AEGIS AI'}</span>{message.model && <span>· {message.model}</span>}</div>
              <div className="whitespace-pre-wrap text-sm leading-6 text-text-primary">{message.content}</div>
              {message.attachments?.length ? <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map((file) => <span key={file.id} className="inline-flex items-center gap-1 rounded border border-border-subtle px-2 py-1 text-[10px] text-text-muted"><FileText className="h-3 w-3" />{file.name}</span>)}</div> : null}
              {message.artifacts?.length ? <div className="mt-3 space-y-2"><div className="text-[10px] uppercase tracking-wider text-text-dim">Generated files</div>{message.artifacts.map((artifact) => <button key={artifact.id} type="button" onClick={() => void downloadMessageArtifact(artifact)} className="flex w-full items-center gap-2 rounded border border-success/30 bg-success-muted px-3 py-2 text-left text-xs text-success hover:bg-success/20"><Download className="h-3.5 w-3.5" /><span className="truncate">Download {artifact.name}</span></button>)}</div> : null}
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 text-xs text-text-muted"><Loader2 className="h-4 w-4 animate-spin text-accent-primary" />AI is processing locally and streaming progress…</div>}
          {!loading && messages.length === 0 && <div className="h-full flex items-center justify-center text-center text-xs text-text-dim">Start a task or attach one or more files.</div>}
        </div>
        <form onSubmit={sendMessage} className="border-t border-border-subtle bg-bg-surface p-3 space-y-2">
          {files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((file) => <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-1 rounded border border-accent-primary/30 bg-accent-primary/5 px-2 py-1 text-[10px] text-text-secondary"><FileText className="h-3 w-3" />{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X className="h-3 w-3" /></button></span>)}</div>}
          <div className="flex items-end gap-2">
            <label className="cursor-pointer rounded p-2 text-text-muted hover:bg-bg-subtle hover:text-text-primary" title="Attach files">
              <Paperclip className="h-4 w-4" />
              <input type="file" multiple className="hidden" onChange={handleFiles} />
            </label>
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={2} className="min-h-10 flex-1 resize-none rounded border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-primary" placeholder="Ask AEGIS or describe what to do with the attached files…" />
            <Button type="submit" size="sm" disabled={sending || (!input.trim() && files.length === 0)}><Send className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center justify-between text-[10px] text-text-dim"><ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} /><span>Selected model applies to this task only.</span></div>
        </form>
      </main>

      <aside className="hidden w-80 shrink-0 border-l border-border-subtle bg-bg-surface lg:flex flex-col">
        <div className="flex border-b border-border-subtle text-[10px] uppercase tracking-wider font-mono">{(['telemetry', 'network', 'artifacts'] as const).map((tab) => <button key={tab} onClick={() => setRightTab(tab)} className={cn('flex-1 px-2 py-3', rightTab === tab ? 'border-b-2 border-accent-primary text-text-primary' : 'text-text-dim')}>{tab}</button>)}</div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pendingPermission && <div className="rounded border border-status-warning/40 bg-status-warning/10 p-3 space-y-3"><div className="flex items-center gap-2 text-xs font-medium text-status-warning"><Shield className="h-4 w-4" />Permission required</div><div className="text-xs text-text-secondary">{pendingPermission.action} wants to perform a protected operation.</div><pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-text-muted">{JSON.stringify(pendingPermission.details, null, 2)}</pre>{isAdmin ? <div className="flex gap-2"><Button size="sm" onClick={() => void decidePermission(pendingPermission, 'approve')} disabled={!!approvalBusy}>Approve</Button><Button size="sm" variant="secondary" onClick={() => void decidePermission(pendingPermission, 'deny')} disabled={!!approvalBusy}>Deny</Button></div> : <div className="text-[10px] text-text-dim">Awaiting an administrator approval.</div>}</div>}
          {rightTab === 'telemetry' && <div className="space-y-2">{activities.map((activity) => <div key={activity.id} className="flex gap-2 border-b border-border-subtle/50 pb-2 text-xs"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-primary" /><div><div className="capitalize text-text-secondary">{activity.action}</div><div className="text-[10px] text-text-dim">{activity.detail}</div></div></div>)}{activities.length === 0 && <div className="text-xs text-text-dim">Task events will appear here.</div>}</div>}
          {rightTab === 'network' && <div className="space-y-3 text-xs"><Metric label="External calls" value={network.external_calls ?? network.external_connections ?? 0} /><Metric label="Local calls" value={network.local_calls ?? 0} /><Metric label="Air-gapped" value={network.air_gapped === false ? 'NO' : 'YES'} /><pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[10px] text-text-dim">{JSON.stringify(network, null, 2)}</pre></div>}
          {rightTab === 'artifacts' && <div className="space-y-2">{artifacts.map((artifact) => <div key={artifact.id} className="rounded border border-border-subtle p-3"><div className="flex items-center gap-2 text-xs text-text-primary"><FileText className="h-4 w-4 text-accent-primary" />{artifact.name}</div><div className="mt-1 text-[10px] text-text-dim">{artifact.artifact_type} · {artifact.verification_status}</div><button onClick={() => void downloadArtifact(artifact)} className="mt-2 inline-flex items-center gap-1.5 rounded bg-success-muted px-2 py-1 text-[10px] font-medium text-success hover:bg-success/20"><Download className="h-3 w-3" />Download file</button></div>)}{artifacts.length === 0 && <div className="text-xs text-text-dim">Generated artifacts will appear here.</div>}</div>}
        </div>
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="flex items-center justify-between rounded border border-border-subtle px-3 py-2"><span className="text-text-muted">{label}</span><span className="font-mono text-text-primary">{String(value)}</span></div>;
}
