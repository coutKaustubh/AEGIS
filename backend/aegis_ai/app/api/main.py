"""HTTP boundary for the AEGIS orchestration runtime."""

from __future__ import annotations

import asyncio
import json
import os
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


class TaskRequest(BaseModel):
    request: str = Field(min_length=1, max_length=20_000)
    files: list[dict[str, str]] = Field(default_factory=list)
    options: dict[str, Any] = Field(default_factory=dict)


class PermissionDecision(BaseModel):
    reason: str = Field(default="", max_length=500)


class WorkbenchService:
    def __init__(self) -> None:
        registry = ModelRegistry.from_yaml("config/models.yaml")
        self.registry = registry
        self.orchestrator = Orchestrator(registry)
        self.workspace = Path("workspace").resolve()
        self.shared_upload_root = Path(os.getenv("AEGIS_SHARED_UPLOAD_ROOT", "../shared/uploads")).resolve()
        self.tasks: dict[str, dict[str, Any]] = {}
        self._approval_waiters: dict[tuple[str, str], dict[str, Any]] = {}
        self._lock = threading.RLock()

    async def health(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "service": "aegis",
            "models": await self.registry.check_availability(),
            "sandbox": self.orchestrator.workspace_tools.sandbox_status(),
            "network_policy": "local_only",
        }

    async def submit(self, payload: TaskRequest) -> dict[str, Any]:
        execution_id = f"exec-{uuid.uuid4().hex[:12]}"
        events: list[dict[str, Any]] = [{"type": "task_started", "execution_id": execution_id}]
        with self._lock:
            self.tasks[execution_id] = {
                "execution_id": execution_id,
                "status": "queued",
                "stage": "queued",
                "events": events,
                "approval_request": None,
                "approval_history": [],
                "network": {},
            }
        asyncio.create_task(self._run(execution_id, payload))
        return {"execution_id": execution_id, "status": "queued"}

    async def _run(self, execution_id: str, payload: TaskRequest) -> None:
        await asyncio.to_thread(self._run_sync, execution_id, payload)

    def _run_sync(self, execution_id: str, payload: TaskRequest) -> None:
        record = self.tasks[execution_id]
        self._update_record(record, status="running", stage="master")

        def progress(event: dict[str, Any]) -> None:
            raw_type = str(event.get("event") or event.get("type") or "progress").lower()
            event_type = {
                "tool_requested": "tool_started",
                "tool_result": "tool_completed",
                "command_started": "tool_started",
                "command_finished": "tool_completed",
                "verification": "verification_update",
            }.get(raw_type, raw_type)
            item = {
                "execution_id": execution_id,
                "type": event_type,
                "agent": event.get("agent"),
                "tool": event.get("tool") or event.get("tool_name"),
                "message": str(event.get("message") or raw_type),
            }
            with self._lock:
                record["events"].append(item)

        def approval_callback(action: str, *args: Any) -> bool:
            return self._wait_for_approval(execution_id, action, args)

        try:
            staged_files = self._stage_files(execution_id, payload.files)
            request = payload.request
            if staged_files:
                request += "\nAttached workspace files: " + ", ".join(item["path"] for item in staged_files)
            orchestrator = Orchestrator(self.registry)
            orchestrator._approval_fn = approval_callback
            result = asyncio.run(
                orchestrator.run_master(
                    request,
                    context={
                        "api_execution_id": execution_id,
                        "files": staged_files,
                        "options": payload.options,
                    },
                    progress_callback=progress,
                )
            )
            network = self._network_summary(result.get("network_report") or {})
            with self._lock:
                record.update({
                    "status": "success" if not result.get("errors") else "failed",
                    "stage": "final",
                    "result": result,
                    "network": network,
                    "approval_request": None,
                })
                record["events"].append({"execution_id": execution_id, "type": "network_update", "network": network})
                record["events"].append({
                    "execution_id": execution_id,
                    "type": "task_completed" if record["status"] == "success" else "task_failed",
                })
        except Exception as exc:
            with self._lock:
                record.update({"status": "failed", "stage": "final", "error": str(exc)[:500]})
                record["events"].append({"execution_id": execution_id, "type": "task_failed", "message": str(exc)[:300]})

    def _update_record(self, record: dict[str, Any], **values: Any) -> None:
        with self._lock:
            record.update(values)

    @staticmethod
    def _network_summary(report: dict[str, Any]) -> dict[str, Any]:
        """Add frontend-friendly totals while retaining the detailed report."""
        external = int(report.get("external_connections") or report.get("external_connection_count") or 0)
        external_model = int(report.get("external_model_calls") or 0)
        external_tool = int(report.get("external_tool_calls") or 0)
        local_model = int(report.get("local_model_calls") or 0)
        local_tool = int(report.get("local_tool_calls") or 0)
        return {
            **report,
            "external_calls": external_model + external_tool,
            "local_calls": local_model + local_tool,
            "air_gapped": external == 0 and external_model == 0 and external_tool == 0,
        }

    def _stage_files(self, execution_id: str, files: list[dict[str, str]]) -> list[dict[str, str]]:
        destination = self.workspace / "inputs" / execution_id
        staged: list[dict[str, str]] = []
        for item in files:
            source_value = str(item.get("path") or "")
            if not source_value:
                continue
            source = Path(source_value).resolve()
            if not source.is_file():
                continue
            if not (source == self.shared_upload_root or self.shared_upload_root in source.parents):
                continue
            destination.mkdir(parents=True, exist_ok=True)
            safe_name = Path(str(item.get("name") or source.name)).name
            target = destination / safe_name
            shutil.copy2(source, target)
            staged.append({"id": str(item.get("id") or ""), "name": safe_name, "path": str(target)})
        return staged

    def _wait_for_approval(self, execution_id: str, action: str, args: tuple[Any, ...]) -> bool:
        request_id = f"perm-{uuid.uuid4().hex[:12]}"
        if action == "edit_file" and len(args) >= 3:
            details = {"path": str(args[0]), "old_chars": len(str(args[1])), "new_chars": len(str(args[2]))}
        elif action in {"create_file", "create_python_script"} and len(args) >= 2:
            details = {"path": str(args[0]), "content_chars": len(str(args[1]))}
        elif action == "execute_command" and len(args) >= 2:
            details = {"command": str(args[0])[:500], "cwd": str(args[1])[:500]}
        else:
            details = {"arguments": [str(value)[:500] for value in args]}
        waiter = {"event": threading.Event(), "decision": None}
        with self._lock:
            self._approval_waiters[(execution_id, request_id)] = waiter
            record = self.tasks[execution_id]
            approval = {
                "request_id": request_id,
                "action": action,
                "tool": action,
                "details": details,
                "status": "pending",
            }
            record["approval_request"] = approval
            record["approval_history"].append(approval.copy())
            record["events"].append({"execution_id": execution_id, "type": "approval_required", **approval})
        resolved = waiter["event"].wait(timeout=300)
        with self._lock:
            if not resolved:
                waiter["decision"] = False
                record = self.tasks[execution_id]
                record["approval_request"] = None
                for item in record["approval_history"]:
                    if item["request_id"] == request_id:
                        item["status"] = "expired"
                record["events"].append({"execution_id": execution_id, "type": "approval_resolved", "request_id": request_id, "status": "expired"})
            self._approval_waiters.pop((execution_id, request_id), None)
        return bool(waiter["decision"])

    def decide_permission(self, execution_id: str, request_id: str, approved: bool, reason: str) -> dict[str, Any]:
        with self._lock:
            record = self.tasks.get(execution_id)
            waiter = self._approval_waiters.get((execution_id, request_id))
            pending = record.get("approval_request") if record else None
            if record is None or waiter is None or not isinstance(pending, dict) or pending.get("request_id") != request_id:
                raise KeyError("approval_not_pending")
            status = "approved" if approved else "denied"
            waiter["decision"] = approved
            record["approval_request"] = None
            for item in record["approval_history"]:
                if item["request_id"] == request_id:
                    item.update({"status": status, "reason": reason})
            record["events"].append({"execution_id": execution_id, "type": "approval_resolved", "request_id": request_id, "status": status, "reason": reason})
            waiter["event"].set()
            return {"execution_id": execution_id, "request_id": request_id, "status": status}


service = WorkbenchService()
app = FastAPI(title="AEGIS API", version="0.2.0")


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
    return dict(task)


@app.get("/api/tasks/{execution_id}/network")
async def task_network(execution_id: str) -> dict[str, Any]:
    task = service.tasks.get(execution_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return task.get("network") or {}


@app.get("/api/tasks/{execution_id}/permissions")
async def task_permissions(execution_id: str) -> dict[str, Any]:
    task = service.tasks.get(execution_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Execution not found")
    return {"pending": task.get("approval_request"), "history": task.get("approval_history", [])}


@app.post("/api/tasks/{execution_id}/permissions/{request_id}/approve")
async def approve_permission(execution_id: str, request_id: str, decision: PermissionDecision) -> dict[str, Any]:
    try:
        return service.decide_permission(execution_id, request_id, True, decision.reason)
    except KeyError:
        raise HTTPException(status_code=404, detail="Approval request is not pending")


@app.post("/api/tasks/{execution_id}/permissions/{request_id}/deny")
async def deny_permission(execution_id: str, request_id: str, decision: PermissionDecision) -> dict[str, Any]:
    try:
        return service.decide_permission(execution_id, request_id, False, decision.reason)
    except KeyError:
        raise HTTPException(status_code=404, detail="Approval request is not pending")


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
