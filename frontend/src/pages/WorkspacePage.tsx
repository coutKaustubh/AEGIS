import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Lock,
  Paperclip,
  Plus,
  Send,
  Shield,
  Square,
  Terminal,
  WifiOff,
  X,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ModelSelector } from '@/components/workspace/ModelSelector';
import { useAuth } from '@/context/AuthContext';
import { chatService, type AITaskRecord, type ArtifactRecord, type ChatMessageRecord, type ChatSessionRecord, type PermissionRecord } from '@/services/chats';
import { type AegisModel, getDefaultModel } from '@/services/models';
import { systemService, type SystemHealthResponse } from '@/services/system';
import type { AgentActivity, GeneratedArtifact, Message } from '@/types/chat';

function toMessage(message: ChatMessageRecord): Message {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.created_at,
    model: typeof message.metadata?.model === 'string' ? message.metadata.model : undefined,
    attachments: message.attachments?.map((file) => ({
      id: file.id,
      name: file.name,
      type: file.type === 'image' ? 'image' : 'document',
      size: file.size,
      url: file.url || undefined,
    })),
  };
}

function eventPayload(event: Record<string, unknown>): Record<string, unknown> {
  const metadata = event.metadata;
  if (metadata && typeof metadata === 'object' && 'ai_event' in metadata) {
    const nested = (metadata as { ai_event?: unknown }).ai_event;
    if (nested && typeof nested === 'object') return nested as Record<string, unknown>;
  }
  return event;
}

function workflowLabel(type: string, payload: Record<string, unknown>): string {
  const agent = String(payload.agent || 'specialist');
  const tool = String(payload.tool || 'unknown');
  if (type === 'command_started') {
    return `sandbox › ${String(payload.command || 'command started')}${payload.cwd ? `  (cwd: ${payload.cwd})` : ''}`;
  }
  if (type === 'command_finished') {
    const exitCode = payload.exit_code ?? '?';
    const backend = payload.sandbox && typeof payload.sandbox === 'object'
      ? String((payload.sandbox as Record<string, unknown>).backend || '') : '';
    return `sandbox › command finished (exit ${exitCode}${backend ? `, ${backend}` : ''})`;
  }
  const labels: Record<string, string> = {
    task_queued: 'Task queued in the AEGIS backend.',
    user_message_created: 'user message created',
    files_attached: 'files attached',
    ai_task_created: 'ai task created',
    ai_task_submitted: 'ai task submitted',
    task_started: 'task started',
    preprocessing_completed: 'NLP preprocessing completed',
    capability_discovery: 'capability discovery',
    plan_created: 'plan created',
    plan_validated: 'plan validated',
    policy_gateway: 'policy checked',
    approval_checkpoint: 'waiting for approval',
    checkpoint_persisted: 'checkpoint saved',
    specialist_execution: `${agent} working`,
    tool_requested: `tool: ${tool}`,
    tool_result: `tool: ${tool}`,
    step_succeeded: 'step completed',
    step_failed: 'step failed',
    repair_requested: 'recovering from failure',
    repair_rejected: 'recovery unavailable',
    verification_passed: 'verification passed',
    verification_failed: 'verification failed',
    run_failed: 'execution failed safely',
    task_failed: 'task failed',
    ai_task_completed: 'ai task completed',
    assistant_message_created: 'assistant message created',
    final: 'response prepared',
  };
  return labels[type] || String(payload.message || payload.action || type.replaceAll('_', ' '));
}

function toGeneratedArtifact(artifact: ArtifactRecord): GeneratedArtifact {
  return {
    id: artifact.id,
    name: artifact.name,
    type: (artifact.artifact_type === 'md' ? 'markdown' : artifact.artifact_type) as GeneratedArtifact['type'],
    size: Number(artifact.metadata?.size_bytes || 0),
    hash: artifact.sha256,
    downloadUrl: artifact.download_url,
    preview: artifact.preview,
  };
}

function InlineApprovalCard({
  permission,
  isAdmin,
  isBusy,
  onDecide,
}: {
  permission: PermissionRecord;
  isAdmin: boolean;
  isBusy: boolean;
  onDecide: (permission: PermissionRecord, decision: 'approve' | 'deny') => Promise<void>;
}) {
  const isPending = permission.status === 'pending';
  const isApproved = permission.status === 'approved';
  const isExpired = permission.status === 'expired';
  const isDenied = permission.status === 'denied';

  return (
    <div
      className={cn(
        'mb-6 w-full max-w-3xl rounded-lg border p-4 transition-all',
        isPending
          ? 'border-amber-400/40 bg-amber-400/[0.08] shadow-lg shadow-amber-950/20'
          : isApproved
          ? 'border-emerald-400/35 bg-emerald-400/[0.04]'
          : isExpired
          ? 'border-white/20 bg-white/[0.02]'
          : 'border-red-400/35 bg-red-400/[0.04]'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.14em]">
          {isPending ? (
            <>
              <Shield className="h-4 w-4 text-amber-300 animate-pulse" />
              <span className="text-amber-200">Human-in-the-Loop Approval Required</span>
            </>
          ) : isApproved ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300">Action Approved</span>
            </>
          ) : isExpired ? (
            <>
              <Clock className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300">Approval Request Expired</span>
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="text-red-300">Action Denied</span>
            </>
          )}
        </div>
        <Badge variant={isApproved ? 'success' : isDenied ? 'danger' : isExpired ? 'outline' : 'warning'}>
          {permission.status}
        </Badge>
      </div>

      <div className="mt-3 space-y-2">
        <div className="text-xs text-white/90">
          <span className="mr-2 font-mono text-[10px] uppercase text-white/45">Action:</span>
          <span className="font-semibold text-white">{permission.action}</span>
          {permission.tool && (
            <span className="ml-2 font-mono text-[11px] text-cyan-300/80">({permission.tool})</span>
          )}
        </div>

        {permission.details && Object.keys(permission.details).length > 0 && (
          <div className="rounded bg-black/40 p-2.5 font-mono text-[10px] text-white/70">
            {typeof permission.details.path === 'string' && (
              <div className="mb-1 text-emerald-300">Target: {permission.details.path}</div>
            )}
            {typeof permission.details.command === 'string' && (
              <div className="mb-1 text-cyan-300">$ {permission.details.command}</div>
            )}
            <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-white/50">
              {JSON.stringify(permission.details, null, 2)}
            </pre>
          </div>
        )}

        {isPending ? (
          isAdmin ? (
            <div className="mt-3 flex items-center gap-3 pt-1">
              <Button
                size="sm"
                onClick={() => void onDecide(permission, 'approve')}
                disabled={isBusy}
                className="bg-emerald-600 font-mono text-xs text-white hover:bg-emerald-500"
              >
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                {isBusy ? 'Processing...' : 'Approve Action'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void onDecide(permission, 'deny')}
                disabled={isBusy}
                className="font-mono text-xs text-red-200 hover:bg-red-500/20"
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Deny
              </Button>
            </div>
          ) : (
            <div className="mt-2 font-mono text-[10px] text-amber-300/60">
              Awaiting administrator approval (elevated privilege required).
            </div>
          )
        ) : (
          <div className="mt-2 font-mono text-[10px] text-white/40">
            {isApproved
              ? `Authorized by administrator${permission.decision_reason ? `: ${permission.decision_reason}` : ''}`
              : isExpired
              ? `Request expired after deadline${permission.decision_reason ? `: ${permission.decision_reason}` : ''}`
              : `Denied by administrator${permission.decision_reason ? `: ${permission.decision_reason}` : ''}`}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [rightTab, setRightTab] = useState<'telemetry' | 'approvals' | 'network' | 'artifacts'>('telemetry');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [approvalBusy, setApprovalBusy] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectSession = (session: ChatSessionRecord) => {
    localStorage.setItem('aegis_active_session_id', session.id);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('session', session.id);
      return next;
    }, { replace: true });
    void loadSession(session);
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
    if (nextPermissions.some((p) => p.status === 'pending')) {
      setRightTab('approvals');
    }
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
      const trace = Array.isArray(nextTask.result?.trace) ? nextTask.result.trace : [];
      if (trace.length > 0) {
        setActivities(trace.map((entry, index) => {
          const item = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {};
          const type = String(item.step || item.event || 'progress');
          return {
            id: `saved-${taskId}-${index}`,
            action: type.replaceAll('_', ' '),
            detail: workflowLabel(type, item),
            timestamp: String(item.timestamp || nextTask.updated_at),
            status: /failed|error|rejected/i.test(type) ? 'completed' : 'completed',
          } as AgentActivity;
        }));
      }
    }
    return nextTask;
  };

  const monitorTask = async (taskId: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSending(true);

    let isTerminal = false;
    let pollCount = 0;
    const pollTimer = setInterval(async () => {
      if (controller.signal.aborted || isTerminal) {
        clearInterval(pollTimer);
        return;
      }
      pollCount += 1;
      // Watchdog: after 120 polling iterations (4 minutes), stop polling and unlock if task has stalled
      if (pollCount > 120) {
        isTerminal = true;
        clearInterval(pollTimer);
        await refreshTaskData(taskId);
        setSending(false);
        return;
      }
      try {
        const [t, perms] = await Promise.all([
          chatService.getTask(taskId),
          chatService.getPermissions(taskId),
        ]);
        setPermissions(perms);
        if (perms.some((p) => p.status === 'pending')) {
          setRightTab('approvals');
        }
        if (['success', 'failed', 'cancelled'].includes(t.status)) {
          isTerminal = true;
          clearInterval(pollTimer);
          await refreshTaskData(taskId);
          setSending(false);
        }
      } catch {
        // Polling error ignored
      }
    }, 2000);

    try {
      await chatService.streamEvents(taskId, (streamEvent) => {
        if (controller.signal.aborted) return;
        if (streamEvent.task_id && String(streamEvent.task_id) !== taskId) return;
        addActivity(streamEvent);
        const payload = eventPayload(streamEvent);
        const eventType = String(payload.type || payload.event || streamEvent.event || '');
        const metadata = streamEvent.metadata;
        if (eventType === 'assistant_message_created' && metadata && typeof metadata === 'object') {
          const content = (metadata as { content?: unknown }).content;
          const status = String((metadata as { status?: unknown }).status || '');
          if (['success', 'failed', 'cancelled'].includes(status) && typeof content === 'string' && content) {
            setMessages((current) => current.some((item) => item.id === `assistant-${taskId}`)
              ? current
              : [...current, { id: `assistant-${taskId}`, role: 'assistant', content, timestamp: new Date().toISOString() }]);
          }
        }
        if (['approval_required', 'permission_required', 'approval_checkpoint'].includes(String(payload.type || payload.event || streamEvent.event))) {
          void chatService.getPermissions(taskId).then((p) => {
            setPermissions(p);
            if (p.some((item) => item.status === 'pending')) {
              setRightTab('approvals');
            }
          }).catch(() => undefined);
        }
      }, controller.signal);
    } catch (cause) {
      if ((cause as Error)?.name !== 'AbortError') {
        // Polling loop will continue to track task to completion
      }
    } finally {
      isTerminal = true;
      clearInterval(pollTimer);
      if (!controller.signal.aborted) {
        await refreshTaskData(taskId);
        setSending(false);
      }
    }
  };

  const cancelActiveTask = async () => {
    const activeTaskId = task?.id;
    abortRef.current?.abort();
    setSending(false);
    if (activeTaskId) {
      try {
        const updated = await chatService.cancelTask(activeTaskId);
        setTask(updated);
      } catch {
        // Ignore network or already finished errors
      }
      await refreshTaskData(activeTaskId);
    }
  };

  const loadSession = async (session: ChatSessionRecord) => {
    setActiveSession(session);
    setError('');
    abortRef.current?.abort();
    setTask(null);
    setArtifacts([]);
    setActivities([]);
    setNetwork({});
    setPermissions([]);
    try {
      const detail = await chatService.getSession(session.id);
      const hydratedMessages = await Promise.all((detail.chats || []).map(async (chat) => {
        const message = toMessage(chat);
        const taskId = typeof chat.metadata?.ai_task_id === 'string' ? chat.metadata.ai_task_id : '';
        if (chat.role === 'assistant' && taskId && chat.metadata?.status !== 'failed') {
          try {
            message.artifacts = (await chatService.getArtifacts(taskId)).map(toGeneratedArtifact);
          } catch {
            // The chat remains readable even when an old artifact was removed.
          }
        }
        return message;
      }));
      setMessages(hydratedMessages);

      const latestTaskId = detail.latest_task_id
        || detail.latest_task?.id
        || [...(detail.chats || [])].reverse()
          .map((chat) => chat.metadata?.ai_task_id)
          .find((value): value is string => typeof value === 'string');

      if (latestTaskId) {
        try {
          const [savedTask, savedArtifacts, savedNetwork, savedPermissions] = await Promise.all([
            chatService.getTask(latestTaskId),
            chatService.getArtifacts(latestTaskId),
            chatService.getNetwork(latestTaskId),
            chatService.getPermissions(latestTaskId),
          ]);
          setTask(savedTask);
          setArtifacts(savedArtifacts);
          setNetwork(savedNetwork);
          setPermissions(savedPermissions);

          if (savedPermissions.some((p) => p.status === 'pending')) {
            setRightTab('approvals');
          }

          if (savedTask.status === 'queued' || savedTask.status === 'running') {
            void monitorTask(savedTask.id);
          } else {
            const trace = Array.isArray(savedTask.result?.trace) ? savedTask.result.trace : [];
            setActivities(trace.map((entry, index) => {
              const item = (entry && typeof entry === 'object') ? entry as Record<string, unknown> : {};
              const type = String(item.step || item.event || 'progress');
              return {
                id: `saved-${latestTaskId}-${index}`,
                action: type.replaceAll('_', ' '),
                detail: workflowLabel(type, item),
                timestamp: String(item.timestamp || savedTask.updated_at),
                status: /failed|error|rejected/i.test(type) ? 'completed' : 'completed',
              } as AgentActivity;
            }));
          }
        } catch {
          // History remains usable even if a task was deleted independently.
        }
      }
      setSessions((current) => current.map((item) => item.id === detail.id ? detail : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load conversation.');
    }
  };

  useEffect(() => {
    let mounted = true;
    void systemService.health().then((value) => { if (mounted) setHealth(value); }).catch(() => undefined);
    chatService.listSessions().then(async (items) => {
      if (!mounted) return;
      setSessions(items);
      const targetId = searchParams.get('session') || localStorage.getItem('aegis_active_session_id');
      const matched = items.find((item) => item.id === targetId);
      const target = matched || items[0];
      if (target) {
        localStorage.setItem('aegis_active_session_id', target.id);
        if (searchParams.get('session') !== target.id) {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('session', target.id);
            return next;
          }, { replace: true });
        }
        await loadSession(target);
      }
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
      selectSession(session);
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
    const status: AgentActivity['status'] = type === 'approval_checkpoint' || type === 'permission_required'
      ? 'pending'
      : 'completed';
    const detail = workflowLabel(type, payload);
    setActivities((current) => [...current, {
      id: `${type}-${Date.now()}-${Math.random()}`,
      action: type.replaceAll('_', ' '),
      detail,
      timestamp: new Date().toISOString(),
      status,
    }].slice(-60));
  };

  const sendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if ((!input.trim() && files.length === 0) || sending || task?.status === 'queued' || task?.status === 'running' || permissions.some((p) => p.status === 'pending')) return;
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
      // Keep routing with the same Master implementation as cli.py. The
      // request determines the specialist and local model.
      const created = await chatService.ask(text, activeSession?.id, selectedFiles);
      if (!activeSession || activeSession.id !== created.chat_session_id) {
        const session = await chatService.getSession(created.chat_session_id);
        setActiveSession(session);
        localStorage.setItem('aegis_active_session_id', session.id);
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.set('session', session.id);
          return next;
        }, { replace: true });
        setSessions((current) => current.some((item) => item.id === session.id)
          ? current.map((item) => item.id === session.id ? session : item)
          : [session, ...current]);
      }
      setTask(created.task);
      addActivity({ type: 'task_queued', message: 'Task queued in the AEGIS backend.' });
      await monitorTask(created.task.id);
    } catch (cause: any) {
      if ((cause as Error)?.name !== 'AbortError') {
        const conflictDetail = cause?.response?.data?.detail;
        if (cause?.response?.status === 409 || cause?.response?.data?.error === 'task_conflict') {
          setError(conflictDetail || 'Another task is currently running in this chat session. Please wait for it to complete.');
        } else {
          setError(cause instanceof Error ? cause.message : 'The AI task could not be completed.');
        }
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
      if (['queued', 'running'].includes(task.status)) {
        void monitorTask(task.id);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Permission decision failed.');
    } finally {
      setApprovalBusy(null);
    }
  };

  const downloadArtifact = async (artifact: ArtifactRecord) => {
    await downloadFile(artifact.download_url, artifact.name, setError);
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
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (cause) {
      reportError(cause instanceof Error ? cause.message : 'Artifact download failed.');
    }
  };

  const result = task?.result || {};
  const resultTask = typeof result.task === 'object' && result.task !== null ? result.task as Record<string, unknown> : {};
  const verification = typeof result.verification === 'object' && result.verification !== null ? result.verification as Record<string, unknown> : {};
  const outputDir = typeof result.output_dir === 'string' ? result.output_dir : '';
  const route = String(resultTask.required_capabilities || result.selected_agent || 'general').replaceAll(',', ', ');
  const model = String(result.selected_model || task?.model_used || 'local');
  const networkExternal = network.external_calls ?? network.external_connection_count ?? network.external_connections ?? 0;
  const networkLocal = network.local_calls ?? network.local_model_calls ?? network.local_connections ?? 0;
  const modelAvailability = health?.ai_detail?.models || {};
  const isTaskActive = sending || task?.status === 'queued' || task?.status === 'running' || permissions.some((p) => p.status === 'pending');
  const availableModels = Object.values(modelAvailability).filter(Boolean).length;
  const totalModels = Object.keys(modelAvailability).length || 4;

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh)] min-h-[720px] flex-col overflow-hidden bg-[#090a0c] text-[#e7e9ee]">
      <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#0e1013] px-5 py-3">
        <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded border border-white/30 font-mono text-xs">AE</div><div><div className="font-mono text-sm tracking-[0.18em] text-white">AEGIS</div><div className="text-[10px] text-white/45">Sovereign AI Workbench</div></div></div>
        <div className="hidden items-center gap-5 font-mono text-[10px] uppercase tracking-wider text-white/45 md:flex"><span>local runtime <b className="text-emerald-400">ollama</b></span><span>models <b className="text-emerald-400">{health ? `${availableModels}/${totalModels} available` : 'checking'}</b></span><span>policy <b className="text-emerald-400">enforced</b></span><span>sandbox <b className="text-emerald-400">isolated</b></span><span>network <b className="text-emerald-400">restricted</b></span></div>
        <Badge variant={task?.status === 'success' ? 'success' : task?.status === 'failed' ? 'danger' : task ? 'warning' : 'default'}>{task?.status || 'ready'}</Badge>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0c0e11] md:flex md:flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">Sessions</span><button onClick={() => void createSession()} className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white" title="New session"><Plus className="h-4 w-4" /></button></div>
          <div className="min-h-0 flex-1 overflow-y-auto">{sessions.map((session) => <button key={session.id} onClick={() => selectSession(session)} className={cn('w-full border-b border-white/5 px-4 py-3 text-left', activeSession?.id === session.id ? 'bg-white/10' : 'hover:bg-white/5')}><div className="truncate text-xs text-white/85">{session.chat_title}</div><div className="mt-1 font-mono text-[9px] text-white/35">{new Date(session.updated_at).toLocaleString()}</div></button>)}{!loading && sessions.length === 0 && <div className="p-4 text-xs text-white/35">No sessions yet.</div>}</div>
          <div className="border-t border-white/10 p-4 font-mono text-[10px] text-white/40"><div className="mb-2 flex items-center gap-2 text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AIR-GAPPED / LOCAL</div><div>PoA · runtime ready</div></div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3"><div className="font-mono text-xs text-white/65"><span className="text-cyan-300">AEGIS</span> <span className="text-white/30">/ session</span> <span className="text-white/80">{activeSession?.id?.slice(0, 18) || 'new-session'}</span></div>{task && <div className="font-mono text-[10px] text-white/35">task {task.id.slice(0, 8)}</div>}</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-10">
            {error && <div className="mb-4 flex items-start gap-2 rounded border border-red-400/30 bg-red-400/10 p-3 text-xs text-red-200"><AlertTriangle className="h-4 w-4 shrink-0" />{error}<button className="ml-auto" onClick={() => setError('')}><X className="h-3 w-3" /></button></div>}
            {messages.length === 0 && !sending && <div className="mb-8 rounded border border-white/10 bg-[#0e1013] p-5 font-mono text-xs text-white/50"><div className="mb-3 text-cyan-300">AEGIS ready</div><div>Submit a request to run the same Master workflow as <span className="text-white/80">cli.py</span>.</div><div className="mt-2 text-white/35">Plans, policy checks, checkpoints, tools, recovery, verification, and artifacts appear here as they happen.</div></div>}
            {messages.map((message) => message.role === 'user' ? <div key={message.id} className="mb-6 flex justify-end"><div className="w-full max-w-3xl"><div className="mb-2 text-right font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">you &gt;</div><div className="whitespace-pre-wrap rounded border border-white/15 bg-[#0e1013] px-4 py-3 text-sm text-white/85">{message.content}{message.attachments?.length ? <div className="mt-3 flex flex-wrap justify-end gap-2">{message.attachments.map((file) => <span key={file.id} className="inline-flex items-center gap-1 rounded border border-white/15 px-2 py-1 font-mono text-[10px] text-white/55"><FileText className="h-3 w-3" />{file.name}</span>)}</div> : null}</div></div></div> : message.role === 'assistant' ? <div key={message.id} className="mb-6 flex justify-start"><div className="w-full max-w-3xl rounded border border-emerald-400/25 bg-emerald-400/[0.025] p-4"><div className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-300/70">response</div><div className="whitespace-pre-wrap text-sm leading-6 text-white/85">{message.content}</div>{message.artifacts?.length ? <div className="mt-3 space-y-3">{message.artifacts.map((artifact) => <div key={artifact.id} className="rounded border border-cyan-300/20 bg-cyan-300/[0.03] p-2"><button type="button" onClick={() => void downloadFile(artifact.downloadUrl, artifact.name, setError)} className="flex items-center gap-2 font-mono text-xs text-cyan-200 hover:underline"><Download className="h-3.5 w-3.5" />Download {artifact.name}</button>{artifact.preview ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border-t border-white/10 pt-2 font-mono text-[10px] leading-5 text-white/60">{artifact.preview}</pre> : null}</div>)}</div> : null}</div></div> : null)}

            {permissions.map((permission) => (
              <InlineApprovalCard
                key={`inline-${permission.id || permission.request_id}`}
                permission={permission}
                isAdmin={isAdmin}
                isBusy={approvalBusy === permission.request_id}
                onDecide={decidePermission}
              />
            ))}

            {(activities.length > 0 || sending) && <section className="mb-6 rounded border border-white/10 bg-[#0e1013] p-4"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45"><Terminal className="h-3.5 w-3.5 text-cyan-300" /> execution trace</div><div className="space-y-2 font-mono text-xs">{activities.map((activity) => <div key={activity.id} className="flex gap-3"><span className={cn('w-3 text-center', activity.status === 'pending' ? 'text-amber-300' : /failed|error|rejected/i.test(activity.action) ? 'text-red-300' : 'text-emerald-300')}>{activity.status === 'pending' ? '!' : /failed|error|rejected/i.test(activity.action) ? '×' : '✓'}</span><span className="text-white/80">{activity.detail}</span></div>)}{sending && <div className="flex gap-3 text-white/45"><Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" /> running local workflow…</div>}</div></section>}

            {activities.some((activity) => activity.action === 'command started' || activity.action === 'command finished') && <section className="mb-6 rounded border border-cyan-300/25 bg-[#07090b] p-4"><div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-cyan-200"><Terminal className="h-3.5 w-3.5" /> sandbox terminal</div><div className="space-y-1 font-mono text-xs text-emerald-300">{activities.filter((activity) => activity.action === 'command started' || activity.action === 'command finished').map((activity) => <div key={`terminal-${activity.id}`}><span className="mr-2 text-white/35">$</span>{activity.detail}</div>)}</div></section>}

            {task && ['success', 'failed', 'cancelled'].includes(task.status) && <section className={cn('rounded border p-5', task.status === 'success' ? 'border-emerald-400/35 bg-emerald-400/[0.04]' : 'border-red-400/35 bg-red-400/[0.04]')}><div className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-white/65"><span className={task.status === 'success' ? 'text-emerald-300' : 'text-red-300'}>{task.status === 'success' ? 'Response' : 'Execution failed safely'}</span></div><div className="whitespace-pre-wrap text-sm leading-6 text-white/90">{task.response_text || 'No response was returned.'}</div><div className="mt-5 grid gap-2 border-t border-white/10 pt-4 font-mono text-[10px] text-white/55 sm:grid-cols-2"><Meta label="route" value={route} /><Meta label="model" value={model} /><Meta label="verification" value={String(verification.status || (task.status === 'success' ? 'verified' : 'failed'))} /><Meta label="approval" value={resultTask.requires_human_approval ? 'required' : 'not required'} />{outputDir && <Meta label="artifacts" value={task.status !== 'failed' && artifacts.length ? `${artifacts.length} downloadable files` : 'none'} />}</div>{task.status !== 'failed' && artifacts.length > 0 && <div className="mt-5 border-t border-white/10 pt-4"><div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-white/40">generated artifacts</div><div className="space-y-2">{artifacts.map((artifact) => <div key={artifact.id} className="rounded border border-cyan-300/20 bg-cyan-300/[0.03] p-2"><button type="button" onClick={() => void downloadArtifact(artifact)} className="flex w-full items-center gap-2 rounded border border-cyan-300/25 bg-cyan-300/5 px-3 py-2 text-left font-mono text-xs text-cyan-200 hover:bg-cyan-300/10"><Download className="h-3.5 w-3.5" /><span className="truncate">Download {artifact.name}</span><span className="ml-auto text-[10px] text-white/35">{artifact.verification_status}</span></button>{artifact.preview ? <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap border-t border-white/10 pt-2 font-mono text-[10px] leading-5 text-white/60">{artifact.preview}</pre> : null}</div>)}</div></div>}</section>}
          </div>

          <form onSubmit={sendMessage} className="shrink-0 border-t border-white/10 bg-[#0c0e11] px-5 py-4 lg:px-10">
            <div className="mx-auto max-w-4xl">
              {isTaskActive && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2 font-mono text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-amber-300 animate-pulse" />
                    <span>Task in progress: Session is locked while an execution is running or awaiting approval.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void cancelActiveTask()}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/30 transition-colors"
                    title="Abort running workflow and unlock session"
                  >
                    <Square className="h-3 w-3 fill-rose-300" />
                    Stop &amp; Unlock
                  </button>
                </div>
              )}
              {files.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{files.map((file) => <span key={`${file.name}-${file.lastModified}`} className="inline-flex items-center gap-1 rounded border border-cyan-300/25 bg-cyan-300/5 px-2 py-1 font-mono text-[10px] text-white/65"><FileText className="h-3 w-3" />{file.name}<button type="button" onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X className="h-3 w-3" /></button></span>)}</div>}
              <div className="flex items-end gap-2">
                <label className={cn("rounded border border-white/10 p-2 text-white/45", isTaskActive ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-white/10 hover:text-white")} title={isTaskActive ? "Task in progress" : "Attach files"}>
                  <Paperclip className="h-4 w-4" />
                  <input type="file" multiple disabled={isTaskActive} className="hidden" onChange={handleFiles} />
                </label>
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }}
                  rows={2}
                  disabled={isTaskActive}
                  className={cn("min-h-11 flex-1 resize-none rounded border border-white/15 bg-[#090a0c] px-3 py-2 font-mono text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/50", isTaskActive && "cursor-not-allowed opacity-60")}
                  placeholder={isTaskActive ? "Task in progress... this session is locked until execution completes." : "you > describe a task for AEGIS…"}
                />
                {isTaskActive ? (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => void cancelActiveTask()}
                    title="Stop active execution and unlock session"
                    className="bg-rose-600/80 hover:bg-rose-600 text-white"
                  >
                    <Square className="h-4 w-4 fill-white" />
                  </Button>
                ) : (
                  <Button type="submit" size="sm" disabled={!input.trim() && files.length === 0}>
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/35">
                <ModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
                <span>Enter to run · Shift+Enter for a newline</span>
              </div>
            </div>
          </form>
        </main>

        <aside className="hidden w-72 shrink-0 border-l border-white/10 bg-[#0c0e11] xl:flex xl:flex-col">
          <div className="flex border-b border-white/10 font-mono text-[10px] uppercase tracking-wider">
            {(['telemetry', 'approvals', 'network', 'artifacts'] as const).map((tab) => {
              const pendingCount = tab === 'approvals' ? permissions.filter((p) => p.status === 'pending').length : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={cn(
                    'relative flex-1 px-2 py-3 text-center transition-colors',
                    rightTab === tab ? 'border-b-2 border-cyan-300 font-medium text-white' : 'text-white/35 hover:text-white/70'
                  )}
                >
                  <span>{tab}</span>
                  {pendingCount > 0 && (
                    <span className="ml-1 rounded-full bg-amber-400 px-1.5 py-0.5 font-mono text-[9px] font-bold text-black animate-pulse">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {rightTab === 'approvals' && (
              <div className="space-y-4 font-mono text-xs">
                {permissions.length === 0 ? (
                  <div className="py-8 text-center text-white/35">
                    <Shield className="mx-auto mb-2 h-6 w-6 text-white/20" />
                    No approval requests for this task.
                  </div>
                ) : (
                  permissions.map((permission) => (
                    <div
                      key={`side-${permission.id || permission.request_id}`}
                      className={cn(
                        'space-y-2 rounded border p-3',
                        permission.status === 'pending'
                          ? 'border-amber-300/40 bg-amber-300/[0.06]'
                          : permission.status === 'approved'
                          ? 'border-emerald-400/30 bg-emerald-400/[0.04]'
                          : permission.status === 'expired'
                          ? 'border-white/20 bg-white/[0.02]'
                          : 'border-red-400/30 bg-red-400/[0.04]'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px]">
                          {permission.status === 'pending' ? (
                            <Shield className="h-3.5 w-3.5 text-amber-300" />
                          ) : permission.status === 'approved' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : permission.status === 'expired' ? (
                            <Clock className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          )}
                          <span className={permission.status === 'pending' ? 'text-amber-200' : permission.status === 'approved' ? 'text-emerald-300' : permission.status === 'expired' ? 'text-amber-300' : 'text-red-300'}>
                            {permission.action}
                          </span>
                        </div>
                        <Badge variant={permission.status === 'approved' ? 'success' : permission.status === 'denied' ? 'danger' : permission.status === 'expired' ? 'outline' : 'warning'}>
                          {permission.status}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-white/70">
                        {permission.tool ? `Tool: ${permission.tool}` : 'Protected system action'}
                      </div>
                      {permission.details && Object.keys(permission.details).length > 0 && (
                        <pre className="max-h-32 overflow-auto rounded bg-black/40 p-2 text-[10px] text-white/50">
                          {JSON.stringify(permission.details, null, 2)}
                        </pre>
                      )}
                      {permission.status === 'pending' ? (
                        isAdmin ? (
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" onClick={() => void decidePermission(permission, 'approve')} disabled={!!approvalBusy} className="flex-1 bg-emerald-600 font-mono text-xs text-white hover:bg-emerald-500">
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => void decidePermission(permission, 'deny')} disabled={!!approvalBusy} className="flex-1 font-mono text-xs">
                              Deny
                            </Button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-white/40">Awaiting administrator approval.</div>
                        )
                      ) : (
                        <div className="mt-1 font-mono text-[10px] text-white/40">
                          {permission.status === 'approved'
                            ? `Authorized${permission.decision_reason ? `: ${permission.decision_reason}` : ''}`
                            : permission.status === 'expired'
                            ? `Expired: ${permission.decision_reason || 'Timed out after 300 seconds'}`
                            : `Denied${permission.decision_reason ? `: ${permission.decision_reason}` : ''}`}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
            {rightTab === 'telemetry' && (
              <div className="space-y-2 font-mono text-[10px]">
                {activities.length === 0 ? (
                  <div className="text-white/35">Operational events will appear here.</div>
                ) : (
                  activities.slice().reverse().map((activity) => (
                    <div key={`side-${activity.id}`} className="border-b border-white/5 pb-2 text-white/60">
                      {activity.detail}
                    </div>
                  ))
                )}
              </div>
            )}
            {rightTab === 'network' && (
              <div className="space-y-3 font-mono text-xs">
                <Metric label="External calls" value={networkExternal} />
                <Metric label="Local calls" value={networkLocal} />
                <Metric label="Air-gapped" value={network.air_gapped === false ? 'NO' : 'YES'} />
                <div className="flex items-center gap-2 text-emerald-300">
                  <WifiOff className="h-3.5 w-3.5" /> external network restricted
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[10px] text-white/35">
                  {JSON.stringify(network, null, 2)}
                </pre>
              </div>
            )}
            {rightTab === 'artifacts' && (
              <div className="space-y-2">
                {task?.status === 'failed' || artifacts.length === 0 ? (
                  <div className="font-mono text-xs text-white/35">No generated artifacts.</div>
                ) : (
                  artifacts.map((artifact) => (
                    <button
                      key={artifact.id}
                      onClick={() => void downloadArtifact(artifact)}
                      className="flex w-full items-center gap-2 rounded border border-white/10 p-3 text-left"
                    >
                      <FileText className="h-4 w-4 text-cyan-300" />
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/75">{artifact.name}</span>
                      <Download className="h-3 w-3 text-white/40" />
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: unknown }) {
  return <div className="flex items-center justify-between rounded border border-border-subtle px-3 py-2"><span className="text-text-muted">{label}</span><span className="font-mono text-text-primary">{String(value)}</span></div>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return <div className="flex gap-3"><span className="w-24 shrink-0 text-white/35">{label}</span><span className="break-all text-white/75">{value}</span></div>;
}
