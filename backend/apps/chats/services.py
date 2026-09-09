"""Application services for chat requests and AI execution persistence."""

from __future__ import annotations

import hashlib
import os
import time
import uuid
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor

from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.db import close_old_connections

from apps.chats.ai_client import AIClient, AIServiceError
from apps.chats.models import ai_tasks, artifacts, attachments, chat_sessions, chats, permission_requests
from apps.chats.session_logs import SessionLog
from apps.chats.response_contract import canonicalize


class TaskConflictError(Exception):
    """Raised when attempting to execute a task in a session that already has an active task."""
    pass


_AI_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="aegis-ai")


def resolve_session(user, session_id=None):
    if session_id:
        return chat_sessions.objects.get(id=session_id, user=user)
    return chat_sessions.objects.create(user=user, chat_title="New Chat")


def set_session_title(session: chat_sessions, content: str, *, has_files: bool = False) -> None:
    """Give every conversation a useful title after its first request."""
    if session.chat_title and session.chat_title != "New Chat":
        return
    title = " ".join(str(content or "").split()).strip()
    if not title:
        title = "Document review" if has_files else "AEGIS conversation"
    max_title_length = 60
    if len(title) > max_title_length:
        title = title[:max_title_length - 1].rstrip() + "…"
    session.chat_title = title
    session.save(update_fields=["chat_title", "updated_at"])


def _save_uploaded_files(message: chats, uploaded_files: list[Any]) -> list[dict[str, str]]:
    shared_root = Path(settings.AI_SHARED_UPLOAD_DIR).resolve()
    shared_root.mkdir(parents=True, exist_ok=True)
    storage = FileSystemStorage(location=str(shared_root), base_url="/shared/uploads/")
    result = []
    for uploaded in uploaded_files:
        # Some deployed databases still have the legacy varchar(100) column
        # even though the current model allows 255 characters. Keep the
        # persisted display name safe until the schema migration is applied,
        # while preserving the extension used by the runtime and downloads.
        original_name = str(getattr(uploaded, "name", "upload"))
        stem, suffix = os.path.splitext(original_name)
        max_db_name = 100
        display_name = original_name[:max_db_name]
        if len(original_name) > max_db_name:
            stem_limit = max(1, max_db_name - len(suffix))
            display_name = f"{stem[:stem_limit]}{suffix}"
        # The deployed database may still have the legacy FileField varchar(100)
        # constraint. Store a compact unique filename so the absolute path
        # remains safely below that limit; keep the user's original filename
        # in file_name for the UI.
        safe_name = storage.get_available_name(f"{uuid.uuid4().hex}{suffix}")
        saved_name = storage.save(safe_name, uploaded)
        path = Path(storage.path(saved_name)).resolve()
        attachment = attachments.objects.create(
            message=message,
            file=str(path),
            file_name=display_name,
            file_type=getattr(uploaded, "content_type", "") or "",
            file_size=getattr(uploaded, "size", 0),
        )
        result.append({"id": str(attachment.id), "name": uploaded.name, "path": str(path)})
    return result


def _extract_answer(task_payload: dict[str, Any]) -> str:
    result = task_payload.get("result") or {}
    if isinstance(result, dict):
        answer = result.get("final_answer") or result.get("answer")
        if answer:
            return str(answer)
    return str(task_payload.get("error") or "The AI service did not return an answer.")


def _artifact_details(path: Path) -> dict[str, str]:
    details = {"sha256": "", "verification_status": "missing"}
    try:
        if path.is_file():
            digest = hashlib.sha256()
            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    digest.update(chunk)
            details.update({"sha256": digest.hexdigest(), "verification_status": "verified"})
    except OSError:
        details["verification_status"] = "unreadable"
    return details


def _register_artifacts(task: ai_tasks, payload: dict[str, Any]) -> None:
    if getattr(task, "status", "") == "failed" or payload.get("status") == "failed":
        return
    result = payload.get("result") or {}
    candidates: list[Any] = []

    def collect(value: Any) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {"artifacts", "artifact_files", "artifacts_map"}:
                    if isinstance(item, dict):
                        candidates.extend({"path": path, "name": name} for name, path in item.items())
                    elif isinstance(item, list):
                        candidates.extend(item)
                collect(item)
        elif isinstance(value, list):
            for item in value:
                collect(item)

    collect(payload)
    if isinstance(result, dict):
        candidates.extend(result.get("artifacts") or [] if isinstance(result.get("artifacts"), list) else [])
        # Document inspection returns a named artifact map (ocr_text,
        # findings, metadata, trace, ...), not only a flat list. Register each
        # file so the chat can offer the same clickable downloads as ChatGPT.
        artifact_map = result.get("artifact_files") or result.get("artifacts_map")
        if isinstance(artifact_map, dict):
            candidates.extend({"path": path, "name": key} for key, path in artifact_map.items())
        elif isinstance(result.get("artifacts"), dict):
            candidates.extend({"path": path, "name": key} for key, path in result["artifacts"].items())
        for agent_result in result.get("agent_results") or []:
            if isinstance(agent_result, dict):
                candidates.extend(agent_result.get("artifacts") or [])
                nested = agent_result.get("result")
                if isinstance(nested, dict) and isinstance(nested.get("artifacts"), dict):
                    candidates.extend({"path": path, "name": key} for key, path in nested["artifacts"].items())
    for candidate in candidates:
        if isinstance(candidate, str):
            raw = Path(candidate)
            if not raw.is_absolute():
                parts = raw.parts[1:] if raw.parts and raw.parts[0] == Path(settings.AI_ARTIFACT_ROOT).name else raw.parts
                path = Path(settings.AI_ARTIFACT_ROOT).resolve().joinpath(*parts)
            else:
                path = raw
            details = _artifact_details(path)
            artifacts.objects.get_or_create(
                task=task,
                path=str(path),
                defaults={"name": path.name or "artifact", "artifact_type": path.suffix.lstrip(".") or "file", **details},
            )
        elif isinstance(candidate, dict) and candidate.get("path"):
            raw = Path(str(candidate["path"]))
            if not raw.is_absolute():
                parts = raw.parts[1:] if raw.parts and raw.parts[0] == Path(settings.AI_ARTIFACT_ROOT).name else raw.parts
                path = Path(settings.AI_ARTIFACT_ROOT).resolve().joinpath(*parts)
            else:
                path = raw
            details = _artifact_details(path)
            artifacts.objects.get_or_create(
                task=task,
                path=str(path),
                defaults={
                    "name": str(candidate.get("name") or path.name or "artifact"),
                    "artifact_type": str(candidate.get("format") or path.suffix.lstrip(".") or "file"),
                    "verification_status": str(candidate.get("verification_status") or details["verification_status"]),
                    "sha256": str(candidate.get("sha256") or details["sha256"]),
                    "metadata": candidate,
                },
            )


def _sync_permission(task: ai_tasks, payload: dict[str, Any]) -> None:
    """Mirror the AI service's pending/finished approval state in Django."""
    pending = payload.get("approval_request")
    # FastAPI emits approval requests as event metadata while the worker is
    # polling. Promote that same record into the canonical Django permission
    # table immediately so the chat can render an approval card in real time.
    if not isinstance(pending, dict):
        for event in payload.get("events") or []:
            if not isinstance(event, dict):
                continue
            candidate = event.get("approval") or event.get("approval_request")
            if isinstance(candidate, dict) and candidate.get("request_id"):
                pending = candidate
                break
    if isinstance(pending, dict) and pending.get("request_id"):
        expires_at = timezone.now() + timedelta(seconds=300)
        permission_requests.objects.update_or_create(
            request_id=str(pending["request_id"]),
            defaults={
                "task": task,
                "user": task.user,
                "action": str(pending.get("action") or "approval"),
                "tool": str(pending.get("tool") or pending.get("action") or ""),
                "details": pending,
                "status": "pending",
                "expires_at": expires_at,
            },
        )
    for item in payload.get("approval_history") or []:
        if not isinstance(item, dict) or not item.get("request_id"):
            continue
        status = str(item.get("status") or "pending")
        if status not in {"pending", "approved", "denied", "expired"}:
            continue
        permission_requests.objects.filter(request_id=str(item["request_id"])).update(
            status=status,
            details=item,
            decision_reason=str(item.get("reason") or ""),
        )


def _execute_task(task_id: str) -> None:
    """Run one queued task outside the HTTP request thread."""
    close_old_connections()
    try:
        task = ai_tasks.objects.select_related("session", "user").get(id=task_id)
        session_log = SessionLog(task.session_id, task.user_id)
        client = AIClient()
        task.status = "running"
        task.save(update_fields=["status", "updated_at"])
        try:
            files = list(
                attachments.objects.filter(message=task.request_message).values("id", "file_name", "file")
            ) if task.request_message_id else []
            files = [{"id": str(item["id"]), "name": item["file_name"], "path": item["file"]} for item in files]
            submitted = client.create_task(request=task.request_text, files=files, options=task.request_message.metadata if task.request_message_id else {})
            task.execution_id = submitted.execution_id
            task.status = submitted.status
            task.save(update_fields=["execution_id", "status", "updated_at"])
            session_log.write("ai_task_submitted", task_id=task.id, execution_id=submitted.execution_id, status=submitted.status)
            seen_events = 0
            last_heartbeat = time.monotonic()

            def record_updates(update):
                nonlocal seen_events, last_heartbeat
                events = update.get("events") or []
                for event in events[seen_events:]:
                    session_log.write(str(event.get("type") or event.get("event") or "ai_progress"), task_id=task.id, ai_event=event)
                seen_events = len(events)
                _sync_permission(task, update)
                now_mono = time.monotonic()
                if now_mono - last_heartbeat >= 2.0:
                    last_heartbeat = now_mono
                    task.updated_at = timezone.now()
                    task.save(update_fields=["updated_at"])

            final = client.wait_for_task(submitted.execution_id, on_update=record_updates)
            task.refresh_from_db(fields=["status"])
            if task.status != "cancelled":
                task.status = str(final.get("status", "failed"))
                task.result = canonicalize(final.get("result"), task.id)
                task.network = final.get("network") or (task.result or {}).get("network_report") or {}
                task.model_used = str((task.result or {}).get("model") or (task.result or {}).get("model_used") or "")
                task.error = str(final.get("error") or "")
                task.response_text = task.result["response"]["content"]
                task.save(update_fields=["status", "result", "network", "model_used", "error", "response_text", "updated_at"])
            # The status endpoint omits its event list; fetch the completed
            # stream so session logs contain the full workflow.
            for event in client.get_events(submitted.execution_id):
                session_log.write(
                    str(event.get("type") or event.get("event") or "ai_progress"),
                    task_id=task.id,
                    ai_event=event,
                )
            record_updates(final)
            _sync_permission(task, final)
            if task.status != "failed" and task.status != "cancelled":
                _register_artifacts(task, final)
            session_log.write("ai_task_completed", task_id=task.id, status=task.status, model=task.model_used)
        except AIServiceError as exc:
            task.refresh_from_db(fields=["status"])
            if task.status != "cancelled":
                task.status = "failed"
                task.error = str(exc)
                task.response_text = "AI service error: " + str(exc)
                task.save(update_fields=["status", "error", "response_text", "updated_at"])
            session_log.write("ai_task_failed", task_id=task.id, status=task.status, error=str(exc))
        except Exception as exc:
            task.refresh_from_db(fields=["status"])
            if task.status != "cancelled":
                task.status = "failed"
                task.error = f"Unexpected worker error: {exc}"
                task.response_text = task.error
                task.save(update_fields=["status", "error", "response_text", "updated_at"])
            session_log.write("ai_task_failed", task_id=task.id, status=task.status, error=task.error)

        if not task.assistant_message:
            assistant = chats.objects.create(
                session=task.session,
                role="assistant",
                content=task.response_text,
                message_type="text",
                metadata={"ai_task_id": str(task.id), "status": task.status, "execution_id": task.execution_id},
            )
            task.assistant_message = assistant
            task.save(update_fields=["assistant_message", "updated_at"])
            session_log.write("assistant_message_created", task_id=task.id, message_id=assistant.id, content=assistant.content, status=task.status)
        for artifact in task.artifacts.all():
            session_log.write("artifact_registered", task_id=task.id, artifact_id=artifact.id, name=artifact.name, path=artifact.path)
        task.session.save(update_fields=["updated_at"])
    finally:
        close_old_connections()


def recover_stale_tasks(*, session=None, max_age_seconds: int = 180) -> list[str]:
    """Recover tasks stuck in queued or running state past their TTL and mark them failed."""
    now = timezone.now()
    threshold = now - timedelta(seconds=max_age_seconds)
    qs = ai_tasks.objects.filter(status__in=["queued", "running"], updated_at__lte=threshold)
    if session is not None:
        qs = qs.filter(session=session)
    recovered_ids = []
    for task in qs.select_related("session", "user"):
        task.status = "failed"
        task.error = "Task execution timed out or worker process terminated."
        task.response_text = "Task execution timed out or was interrupted. You can submit a new message."
        if not task.assistant_message:
            assistant = chats.objects.create(
                session=task.session,
                role="assistant",
                content=task.response_text,
                message_type="text",
                metadata={"ai_task_id": str(task.id), "status": task.status, "recovered": True},
            )
            task.assistant_message = assistant
        task.save(update_fields=["status", "error", "response_text", "assistant_message", "updated_at"])
        permission_requests.objects.filter(task=task, status="pending").update(
            status="expired",
            decision_reason="Task timed out",
            updated_at=now,
        )
        session_log = SessionLog(task.session_id, task.user_id)
        session_log.write("ai_task_failed", task_id=task.id, status="failed", error=task.error, reason="stale_recovery")
        recovered_ids.append(str(task.id))
    return recovered_ids


def cancel_task(*, task_id: str, user) -> ai_tasks:
    """Explicitly cancel a queued or running task upon user request."""
    now = timezone.now()
    task = ai_tasks.objects.select_related("session", "user").get(id=task_id, user=user)
    if task.status in {"queued", "running"}:
        if task.execution_id:
            try:
                AIClient().cancel_task(task.execution_id)
            except Exception:
                pass
        task.status = "cancelled"
        task.error = "Execution was cancelled by the user."
        task.response_text = "Task execution was cancelled."
        if not task.assistant_message:
            assistant = chats.objects.create(
                session=task.session,
                role="assistant",
                content=task.response_text,
                message_type="text",
                metadata={"ai_task_id": str(task.id), "status": task.status, "cancelled": True},
            )
            task.assistant_message = assistant
        task.save(update_fields=["status", "error", "response_text", "assistant_message", "updated_at"])
        permission_requests.objects.filter(task=task, status="pending").update(
            status="denied",
            decision_reason="Task cancelled by user",
            updated_at=now,
        )
        session_log = SessionLog(task.session_id, task.user_id)
        session_log.write("ai_task_cancelled", task_id=task.id, status="cancelled")
    return task


@transaction.atomic
def start_ai(*, user, content: str, session_id=None, uploaded_files=None, metadata=None) -> dict[str, Any]:
    """Create durable request state and return immediately; work runs in a worker."""
    session = resolve_session(user, session_id)
    recover_stale_tasks(session=session)
    active_task = ai_tasks.objects.filter(session=session, status__in=["queued", "running"]).first()
    if active_task:
        raise TaskConflictError(f"A task ({active_task.id}) is already active in this chat session.")
    session_log = SessionLog(session.id, user.id)
    user_message = chats.objects.create(
        session=session,
        role="user",
        content=content,
        message_type="file" if uploaded_files else "text",
        metadata=metadata or {},
    )
    set_session_title(session, content, has_files=bool(uploaded_files))
    files = _save_uploaded_files(user_message, list(uploaded_files or []))
    session_log.write("user_message_created", message_id=user_message.id, content=content, file_count=len(files))
    if files:
        session_log.write("files_attached", files=files)
    task = ai_tasks.objects.create(user=user, session=session, request_message=user_message, request_text=content)
    user_message.metadata = {**(user_message.metadata or {}), "ai_task_id": str(task.id)}
    user_message.save(update_fields=["metadata"])
    session_log.write("ai_task_created", task_id=task.id, request=content)
    # The worker must not race the transaction that created the task row.
    transaction.on_commit(lambda: _AI_EXECUTOR.submit(_execute_task, str(task.id)))
    return {"task": task, "user_message": user_message, "files": files}


@transaction.atomic
def ask_ai(*, user, content: str, session_id=None, uploaded_files=None, metadata=None) -> dict[str, Any]:
    """Persist a user message, execute AI, and persist the assistant result."""
    session = resolve_session(user, session_id)
    recover_stale_tasks(session=session)
    active_task = ai_tasks.objects.filter(session=session, status__in=["queued", "running"]).first()
    if active_task:
        raise TaskConflictError(f"A task ({active_task.id}) is already active in this chat session.")
    session_log = SessionLog(session.id, user.id)
    user_message = chats.objects.create(
        session=session,
        role="user",
        content=content,
        message_type="file" if uploaded_files else "text",
        metadata=metadata or {},
    )
    set_session_title(session, content, has_files=bool(uploaded_files))
    files = _save_uploaded_files(user_message, list(uploaded_files or []))
    session_log.write("user_message_created", message_id=user_message.id, content=content, file_count=len(files))
    if files:
        session_log.write("files_attached", files=files)
    task = ai_tasks.objects.create(user=user, session=session, request_message=user_message, request_text=content)
    user_message.metadata = {**(user_message.metadata or {}), "ai_task_id": str(task.id)}
    user_message.save(update_fields=["metadata"])
    session_log.write("ai_task_created", task_id=task.id, request=content)
    client = AIClient()
    try:
        submitted = client.create_task(request=content, files=files, options=metadata or {})
        task.execution_id = submitted.execution_id
        task.status = submitted.status
        task.save(update_fields=["execution_id", "status", "updated_at"])
        session_log.write("ai_task_submitted", task_id=task.id, execution_id=submitted.execution_id, status=submitted.status)
        final = client.wait_for_task(submitted.execution_id)
        task.status = str(final.get("status", "failed"))
        task.result = canonicalize(final.get("result"), task.id)
        task.network = final.get("network") or (task.result or {}).get("network_report") or {}
        task.model_used = str((task.result or {}).get("model") or (task.result or {}).get("model_used") or "")
        task.error = str(final.get("error") or "")
        task.response_text = task.result["response"]["content"]
        task.save(update_fields=["status", "result", "network", "model_used", "error", "response_text", "updated_at"])
        for event in client.get_events(submitted.execution_id):
            session_log.write(str(event.get("type") or event.get("event") or "ai_progress"), task_id=task.id, ai_event=event)
        if task.status != "failed":
            _register_artifacts(task, final)
        _sync_permission(task, final)
        session_log.write("ai_task_completed", task_id=task.id, status=task.status, model=task.model_used)
    except AIServiceError as exc:
        task.status = "failed"
        task.error = str(exc)
        task.response_text = "AI service error: " + str(exc)
        task.save(update_fields=["status", "error", "response_text", "updated_at"])
        session_log.write("ai_task_failed", task_id=task.id, status=task.status, error=str(exc))

    assistant = chats.objects.create(
        session=session,
        role="assistant",
        content=task.response_text,
        message_type="text",
        metadata={"ai_task_id": str(task.id), "status": task.status, "execution_id": task.execution_id},
    )
    task.assistant_message = assistant
    task.save(update_fields=["assistant_message", "updated_at"])
    session_log.write("assistant_message_created", task_id=task.id, message_id=assistant.id, content=assistant.content, status=task.status)
    for artifact in task.artifacts.all():
        session_log.write("artifact_registered", task_id=task.id, artifact_id=artifact.id, name=artifact.name, path=artifact.path)
    session.save(update_fields=["updated_at"])
    return {"task": task, "user_message": user_message, "assistant_message": assistant, "files": files}
