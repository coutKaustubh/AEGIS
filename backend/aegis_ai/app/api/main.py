"""Thin HTTP boundary for the existing AEGIS orchestration runtime."""

from __future__ import annotations

import asyncio
import json
import shutil
import threading
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from models.registry import ModelRegistry
from runtime.orchestrator import Orchestrator
from storage.outputs import OutputStore
from aegis.contracts import ExecutionPlan, PlanValidator, WorkflowRegistry
from aegis.governance import AuditChain, PolicyEngine, Principal
from aegis.memory import MemoryStore
from aegis.retrieval import HybridKnowledgeStore
from aegis.evaluation import EvaluationSuite
from aegis.sovereign import KubernetesPlanner, SovereignExecutor, VisualWorkflowEditor
from runtime.background import BackgroundJobManager


class TaskRequest(BaseModel):
    request: str = Field(min_length=1, max_length=20_000)
    files: list[dict[str, str]] = Field(default_factory=list)
    options: dict[str, Any] = Field(default_factory=dict)


class WorkbenchService:
    def __init__(self) -> None:
        registry = ModelRegistry.from_yaml("config/models.yaml")
        self.registry = registry
        self.tasks: dict[str, dict[str, Any]] = {}
        self.workflows = WorkflowRegistry()
        self.plan_validator = PlanValidator()
        self.policy = PolicyEngine()
        self.audit = AuditChain("logs/aegis-chain.jsonl")
        self.memory = MemoryStore(".aegis/memory.sqlite3")
        self.knowledge = HybridKnowledgeStore()
        self.jobs = BackgroundJobManager()
        self.evaluations = EvaluationSuite(".aegis/evaluations.jsonl")
        # The API runs the deterministic capability route by default. RL remains
        # an explicitly enabled experimental strategy, never a hidden fallback.
        self.sovereign = SovereignExecutor(self.plan_validator, self.audit)

    async def health(self) -> dict[str, Any]:
        return {"status": "ok", "service": "aegis", "models": await self.registry.check_availability()}

    async def submit(self, payload: TaskRequest) -> dict[str, Any]:
        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        events: list[dict[str, Any]] = [{"type": "task_started", "execution_id": execution_id}]
        self.tasks[execution_id] = {"execution_id": execution_id, "status": "queued", "events": events}
        task_handle = asyncio.create_task(self._run(execution_id, payload))
        self.tasks[execution_id]["async_task"] = task_handle
        return {"execution_id": execution_id, "status": "queued"}

    def cancel_task(self, execution_id: str) -> bool:
        record = self.tasks.get(execution_id)
        if not record:
            return False
        if record.get("status") in {"success", "failed", "cancelled"}:
            return True
        record["status"] = "cancelled"
        record["stage"] = "final"
        record["error"] = "Task cancelled by user request"
        for waiter in record.get("approval_waiters", {}).values():
            if isinstance(waiter, dict) and "event" in waiter:
                waiter["approved"] = False
                waiter["reason"] = "Task cancelled"
                waiter["event"].set()
        record["events"].append({"execution_id": execution_id, "type": "task_cancelled", "message": "Task cancelled"})
        handle = record.get("async_task")
        if handle and not handle.done():
            handle.cancel()
        return True

    async def _run(self, execution_id: str, payload: TaskRequest) -> None:
        record = self.tasks[execution_id]
        record["status"] = "running"
        record["stage"] = "master"

        def progress(event: dict[str, Any]) -> None:
            # Keep API events high-level; raw prompts and private reasoning are
            # deliberately not exposed.
            item = {"execution_id": execution_id, "type": str(event.get("event", "progress")).lower(),
                    "agent": event.get("agent"), "message": str(event.get("event", ""))}
            record["events"].append(item)

        def request_approval(*args: Any) -> bool:
            """Bridge synchronous tool-policy checks to the HTTP approval API."""
            request_id = f"perm-{uuid.uuid4().hex[:12]}"
            action = str(args[0]) if args else "approval"
            details = " | ".join(str(item)[:500] for item in args[1:])
            waiter = threading.Event()
            pending = {
                "request_id": request_id,
                "action": action,
                "tool": action,
                "details": details,
                "status": "pending",
            }
            record["approval_request"] = pending
            record.setdefault("approval_waiters", {})[request_id] = {"event": waiter, "approved": False}
            record["events"].append({
                "execution_id": execution_id,
                "type": "permission_required",
                "message": f"Approval required for {action}",
                "approval": pending,
            })
            # The Django task timeout is five minutes by default.  Do not let
            # an unattended approval leave an in-process worker stuck forever.
            completed = waiter.wait(timeout=300)
            decision = record.get("approval_waiters", {}).pop(request_id, {"approved": False})
            approved = bool(decision.get("approved"))
            if not completed and not decision.get("reason"):
                pending["status"] = "expired"
                pending["reason"] = "Approval request expired after 300s timeout"
            else:
                pending["status"] = "approved" if approved else "denied"
                pending["reason"] = str(decision.get("reason") or ("Timed out" if not approved else ""))
            record.setdefault("approval_history", []).append(dict(pending))
            record["events"].append({
                "execution_id": execution_id,
                "type": f"permission_{pending['status']}",
                "message": f"Approval {pending['status']} for {action}: {pending['reason']}",
                "approval": pending,
            })
            record.pop("approval_request", None)
            return approved

        def run_task() -> dict[str, Any]:
            # Each execution gets an isolated orchestrator.  Besides avoiding
            # shared mutable run state, this lets a synchronous policy callback
            # wait in this worker thread while the FastAPI event loop remains
            # available to accept the user's approval decision.
            orchestrator = Orchestrator(self.registry)
            orchestrator._approval_fn = request_approval
            uploaded_paths = [
                str(item.get("path"))
                for item in payload.files
                if isinstance(item, dict) and item.get("path")
            ]
            # Django stores uploads in backend/shared/uploads, while the
            # runtime deliberately confines filesystem tools to its own
            # workspace. Copy inputs into the workspace boundary before
            # handing them to document/vision specialists.
            input_root = (orchestrator.workspace_root / "inputs").resolve()
            input_root.mkdir(parents=True, exist_ok=True)
            upload_root = (Path(__file__).resolve().parents[3] / "shared" / "uploads").resolve()
            file_paths: list[str] = []
            for source in uploaded_paths:
                source_path = Path(source).resolve()
                if not source_path.is_file() or not (source_path == upload_root or upload_root in source_path.parents):
                    continue
                target = (input_root / source_path.name).resolve()
                if input_root not in target.parents:
                    continue
                shutil.copy2(source_path, target)
                file_paths.append(str(target))
            context = {
                "api_execution_id": execution_id,
                "files": payload.files,
                "attached_files": file_paths,
                "options": payload.options,
            }
            # The CLI's document/vision workflows receive an explicit input
            # path. Browser uploads arrive as metadata, so promote the first
            # supported attachment into the same context contract.
            for path in file_paths:
                suffix = path.lower().rsplit(".", 1)[-1] if "." in path else ""
                if suffix in {"pdf", "doc", "docx"}:
                    context.setdefault("input_path", path)
                    break
                if suffix in {"png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"}:
                    context.setdefault("image_paths", []).append(path)
            return asyncio.run(orchestrator.run_master(
                payload.request,
                context=context,
                progress_callback=progress,
            ))

        try:
            result = await asyncio.to_thread(run_task)
            record["network"] = result.get("network_report") or {}
            record.update({"status": "success" if not result.get("errors") else "failed", "stage": "final", "result": result})
            record["events"].append({"execution_id": execution_id,
                                     "type": "task_completed" if record["status"] == "success" else "task_failed"})
        except Exception as exc:
            record.update({"status": "failed", "stage": "final", "error": str(exc)[:500]})
            record["events"].append({"execution_id": execution_id, "type": "task_failed", "message": str(exc)[:300]})


service = WorkbenchService()
app = FastAPI(title="AEGIS API", version="0.1.0")


@app.get("/api/health")
async def health() -> dict[str, Any]:
    return await service.health()


@app.post("/api/tasks", status_code=202)
async def create_task(payload: TaskRequest) -> dict[str, Any]:
    return await service.submit(payload)


@app.get("/api/tasks/{execution_id}")
async def task_status(execution_id: str) -> dict[str, Any]:
    task = service.tasks.get(execution_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    # Include a bounded event snapshot so Django's worker can mirror pending
    # approvals while polling. Internal threading primitives remain private.
    result = {k: v for k, v in task.items() if k not in {"approval_waiters", "async_task"}}
    result["events"] = list(task.get("events") or [])[-200:]
    return result


@app.post("/api/tasks/{execution_id}/cancel")
async def cancel_task_endpoint(execution_id: str) -> dict[str, Any]:
    if execution_id not in service.tasks:
        raise HTTPException(status_code=404, detail="Execution not found")
    cancelled = service.cancel_task(execution_id)
    return {"execution_id": execution_id, "status": "cancelled", "cancelled": cancelled}


@app.get("/api/tasks/{execution_id}/network")
async def task_network(execution_id: str) -> dict[str, Any]:
    task = service.tasks.get(execution_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return task.get("network") or (task.get("result") or {}).get("network_report") or {}


class PermissionDecision(BaseModel):
    reason: str = Field(default="", max_length=500)


def _decide_permission(execution_id: str, request_id: str, approved: bool, reason: str) -> dict[str, Any]:
    task = service.tasks.get(execution_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    pending = task.get("approval_request")
    waiter = task.get("approval_waiters", {}).get(request_id)
    if not isinstance(pending, dict) or pending.get("request_id") != request_id or waiter is None:
        raise HTTPException(status_code=409, detail="Permission request is no longer pending")
    waiter["approved"] = approved
    waiter["reason"] = reason
    waiter["event"].set()
    return {"request_id": request_id, "status": "approved" if approved else "denied", "reason": reason}


@app.post("/api/tasks/{execution_id}/permissions/{request_id}/approve")
async def approve_permission(execution_id: str, request_id: str, payload: PermissionDecision) -> dict[str, Any]:
    return _decide_permission(execution_id, request_id, True, payload.reason)


@app.post("/api/tasks/{execution_id}/permissions/{request_id}/deny")
async def deny_permission(execution_id: str, request_id: str, payload: PermissionDecision) -> dict[str, Any]:
    return _decide_permission(execution_id, request_id, False, payload.reason)


@app.get("/api/tasks/{execution_id}/events")
async def task_events(execution_id: str) -> StreamingResponse:
    if execution_id not in service.tasks:
        raise HTTPException(status_code=404, detail="Execution not found")

    async def stream():
        sent = 0
        while True:
            task = service.tasks[execution_id]
            events = task["events"]
            while sent < len(events):
                yield f"data: {json.dumps(events[sent], ensure_ascii=False)}\n\n"
                sent += 1
            if task.get("status") in {"success", "failed", "cancelled"}:
                break
            await asyncio.sleep(0.1)

    return StreamingResponse(stream(), media_type="text/event-stream")


def _principal(subject: str = "local") -> Principal:
    # Authentication providers can replace this boundary with OIDC/LDAP/SCIM.
    return Principal(subject=subject, roles=frozenset({"admin"}))


@app.post("/api/workflows/validate")
async def validate_workflow(plan: ExecutionPlan) -> dict[str, Any]:
    errors = service.plan_validator.validate(plan)
    service.audit.append("workflow_validated", task_id=plan.task_id, valid=not errors, errors=errors)
    return {"valid": not errors, "errors": errors}


@app.post("/api/workflows")
async def register_workflow(name: str, plan: ExecutionPlan, version: str | None = None) -> dict[str, Any]:
    service.policy.check(_principal(), "workflow:run")
    service.plan_validator.require_valid(plan)
    saved = service.workflows.register(name, plan, version=version)
    service.audit.append("workflow_registered", workflow=name, version=saved.version)
    return {"name": name, "version": saved.version, "steps": len(saved.steps)}


@app.get("/api/workflows")
async def list_workflows() -> list[dict[str, str]]:
    return service.workflows.list()


@app.get("/api/workflows/{name}/{version}/visual")
async def visual_workflow(name: str, version: str) -> dict[str, Any]:
    return VisualWorkflowEditor.export(service.workflows.get(name, version))


@app.post("/api/workflows/execute")
async def execute_sovereign_workflow(plan: ExecutionPlan, approve_high_risk: bool = False,
                                     attestation: dict[str, str] | None = None) -> dict[str, Any]:
    """Execute an explicit typed-plan integration contract.

    Normal user tasks use ``POST /api/tasks`` and the production
    ``Orchestrator.run_master`` path. This endpoint is retained for typed-plan
    clients and uses only its deliberately narrow demo executor.
    """
    service.policy.check(_principal(), "workflow:run")

    def demo_executor(step):
        return {"ok": True, "status": "success", "tool": step.tool or step.capability.value,
                "evidence": {"mode": "api-demo", "step": step.id}}

    return await service.sovereign.execute(plan, executor=demo_executor,
                                           approval=lambda _risk, _step: approve_high_risk,
                                           attestation=attestation)


@app.get("/api/kubernetes/manifest")
async def kubernetes_manifest(name: str = "aegis-worker", image: str = "aegis:local",
                              replicas: int = 1, tee_required: bool = False) -> dict[str, Any]:
    return KubernetesPlanner.manifest(name, image, replicas=replicas, tee_required=tee_required)


@app.post("/api/knowledge")
async def add_knowledge(payload: dict[str, Any]) -> dict[str, Any]:
    service.policy.check(_principal(), "rag:read")
    ids = service.knowledge.add(str(payload.get("content", "")), str(payload.get("source", "api")), metadata=payload.get("metadata"))
    return {"chunk_ids": ids}


@app.post("/api/knowledge/search")
async def search_knowledge(payload: dict[str, Any]) -> list[dict[str, Any]]:
    service.policy.check(_principal(), "rag:read")
    results = await service.knowledge.search(str(payload.get("query", "")), top_k=int(payload.get("top_k", 5)))
    return [item.model_dump() for item in results]


@app.post("/api/knowledge/ask")
async def ask_knowledge(payload: dict[str, Any]) -> dict[str, Any]:
    """Retrieve indexed excerpts through the same runtime store used by tasks."""
    service.policy.check(_principal(), "rag:read")
    query = str(payload.get("query", "")).strip()
    results = await service.knowledge.search(query, top_k=int(payload.get("top_k", 5)))
    sources = []
    for item in results:
        data = item.model_dump()
        sources.append({
            "documentName": data.get("source", data.get("document_name", "Knowledge base")),
            "page": int(data.get("page", 0) or 0),
            "snippet": data.get("snippet", data.get("content", "")),
            "relevance": float(data.get("score", data.get("relevance", 0.0)) or 0.0),
        })
    answer = "\n\n".join(f"[{i + 1}] {s['snippet']}" for i, s in enumerate(sources))
    return {"answer": answer or "No indexed excerpts matched this query.", "sources": sources,
            "model": "AEGIS Knowledge Runtime", "processedLocally": True}


@app.post("/api/knowledge/ingest")
async def ingest_knowledge(payload: dict[str, Any]) -> dict[str, Any]:
    """Index a locally uploaded document; paths are constrained to shared uploads."""
    service.policy.check(_principal(), "rag:read")
    raw_path = Path(str(payload.get("path", ""))).resolve()
    allowed_root = (Path(__file__).resolve().parents[3] / "shared" / "uploads").resolve()
    if not raw_path.is_file() or not (raw_path == allowed_root or allowed_root in raw_path.parents):
        raise HTTPException(status_code=400, detail="path is outside the shared upload store")
    content = ""
    if raw_path.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
            content = "\n".join((page.extract_text() or "") for page in PdfReader(str(raw_path)).pages)
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"PDF extraction failed: {exc}") from exc
    else:
        content = raw_path.read_text(encoding="utf-8", errors="replace")
    content = content[:500_000]
    ids = service.knowledge.add(content, str(payload.get("source") or raw_path.name), metadata=payload.get("metadata"))
    return {"chunk_ids": ids, "source": raw_path.name, "characters": len(content)}


@app.post("/api/memory")
async def save_memory(payload: dict[str, Any]) -> dict[str, Any]:
    service.policy.check(_principal(), "task:create")
    memory_id = service.memory.put(str(payload.get("text", "")), scope=str(payload.get("scope", "global")), metadata=payload.get("metadata"), ttl_seconds=payload.get("ttl_seconds"))
    return {"id": memory_id}


@app.get("/api/memory/search")
async def search_memory(query: str, scope: str | None = None) -> list[dict[str, Any]]:
    service.policy.check(_principal(), "task:read")
    return service.memory.search(query, scope=scope)


@app.get("/api/audit/verify")
async def verify_audit() -> dict[str, Any]:
    return {"valid": service.audit.verify(), "chain": "aegis-runtime", "recorded": True}


@app.get("/api/models")
async def list_models() -> dict[str, Any]:
    availability = await service.registry.check_availability()
    models = []
    for config in service.registry.list_models():
        models.append({"id": config.name, "name": config.model, "provider": config.provider,
                       "capabilities": [cap.value for cap in config.capabilities],
                       "context_length": config.context_length, "available": bool(availability.get(config.name))})
    return {"models": models}


@app.post("/api/jobs")
async def create_background_job(payload: TaskRequest) -> dict[str, str]:
    service.policy.check(_principal(), "task:create")

    async def run() -> dict[str, Any]:
        execution_id = await service.submit(payload)
        return execution_id

    job = service.jobs.submit(run, retries=int(payload.options.get("retries", 1)))
    service.audit.append("background_job_created", job_id=job.id)
    return {"job_id": job.id, "status": job.status}


@app.get("/api/jobs/{job_id}")
async def background_job_status(job_id: str) -> dict[str, Any]:
    try:
        return service.jobs.status(job_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@app.delete("/api/jobs/{job_id}")
async def cancel_background_job(job_id: str) -> dict[str, bool]:
    try:
        return {"cancelled": service.jobs.cancel(job_id)}
    except KeyError:
        raise HTTPException(status_code=404, detail="Job not found")


@app.get("/api/evaluations/summary")
async def evaluation_summary() -> dict[str, float]:
    return service.evaluations.summary()
