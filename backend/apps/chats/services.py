"""Application services for chat requests and AI execution persistence."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import transaction
from django.db import close_old_connections

from apps.chats.ai_client import AIClient, AIServiceError
from apps.chats.models import ai_tasks, artifacts, attachments, chat_sessions, chats, permission_requests
from apps.chats.session_logs import SessionLog


_AI_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="aegis-ai")


def resolve_session(user, session_id=None):
    if session_id:
        return chat_sessions.objects.get(id=session_id, user=user)
    return chat_sessions.objects.create(user=user, chat_title="New Chat")


def _save_uploaded_files(message: chats, uploaded_files: list[Any]) -> list[dict[str, str]]:
    shared_root = Path(settings.AI_SHARED_UPLOAD_DIR).resolve()
    shared_root.mkdir(parents=True, exist_ok=True)
    storage = FileSystemStorage(location=str(shared_root), base_url="/shared/uploads/")
    result = []
    for uploaded in uploaded_files:
        safe_name = storage.get_available_name(uploaded.name)
        saved_name = storage.save(safe_name, uploaded)
        path = Path(storage.path(saved_name)).resolve()
        attachment = attachments.objects.create(
            message=message,
            file=str(path),
            file_name=uploaded.name,
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
    result = payload.get("result") or {}
    candidates: list[Any] = []
    if isinstance(result, dict):
        candidates.extend(result.get("artifacts") or [])
        for agent_result in result.get("agent_results") or []:
            if isinstance(agent_result, dict):
                candidates.extend(agent_result.get("artifacts") or [])
    for candidate in candidates:
        if isinstance(candidate, str):
            path = Path(candidate)
            details = _artifact_details(path)
            artifacts.objects.get_or_create(
                task=task,
                path=str(path),
                defaults={"name": path.name or "artifact", "artifact_type": path.suffix.lstrip(".") or "file", **details},
            )
        elif isinstance(candidate, dict) and candidate.get("path"):
            path = Path(str(candidate["path"]))
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
    if isinstance(pending, dict) and pending.get("request_id"):
        permission_requests.objects.update_or_create(
            request_id=str(pending["request_id"]),
            defaults={
                "task": task,
                "user": task.user,
                "action": str(pending.get("action") or "approval"),
                "tool": str(pending.get("tool") or pending.get("action") or ""),
                "details": pending,
                "status": "pending",
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

            def record_updates(update):
                nonlocal seen_events
                events = update.get("events") or []
                for event in events[seen_events:]:
                    session_log.write(str(event.get("type") or event.get("event") or "ai_progress"), task_id=task.id, ai_event=event)
                seen_events = len(events)
                _sync_permission(task, update)

            final = client.wait_for_task(submitted.execution_id, on_update=record_updates)
            task.status = str(final.get("status", "failed"))
            task.result = final.get("result") or {}
            task.network = final.get("network") or (task.result or {}).get("network_report") or {}
            task.model_used = str((task.result or {}).get("model") or (task.result or {}).get("model_used") or "")
            task.error = str(final.get("error") or "")
            task.response_text = _extract_answer(final)
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
            _register_artifacts(task, final)
            session_log.write("ai_task_completed", task_id=task.id, status=task.status, model=task.model_used)
        except AIServiceError as exc:
            task.status = "failed"
            task.error = str(exc)
            task.response_text = "AI service error: " + str(exc)
            task.save(update_fields=["status", "error", "response_text", "updated_at"])
            session_log.write("ai_task_failed", task_id=task.id, status=task.status, error=str(exc))
        except Exception as exc:
            task.status = "failed"
            task.error = f"Unexpected worker error: {exc}"
            task.response_text = task.error
            task.save(update_fields=["status", "error", "response_text", "updated_at"])
            session_log.write("ai_task_failed", task_id=task.id, status=task.status, error=task.error)

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


@transaction.atomic
def start_ai(*, user, content: str, session_id=None, uploaded_files=None, metadata=None) -> dict[str, Any]:
    """Create durable request state and return immediately; work runs in a worker."""
    session = resolve_session(user, session_id)
    session_log = SessionLog(session.id, user.id)
    user_message = chats.objects.create(
        session=session,
        role="user",
        content=content,
        message_type="file" if uploaded_files else "text",
        metadata=metadata or {},
    )
    files = _save_uploaded_files(user_message, list(uploaded_files or []))
    session_log.write("user_message_created", message_id=user_message.id, content=content, file_count=len(files))
    if files:
        session_log.write("files_attached", files=files)
    task = ai_tasks.objects.create(user=user, session=session, request_message=user_message, request_text=content)
    session_log.write("ai_task_created", task_id=task.id, request=content)
    # The worker must not race the transaction that created the task row.
    transaction.on_commit(lambda: _AI_EXECUTOR.submit(_execute_task, str(task.id)))
    return {"task": task, "user_message": user_message, "files": files}
@transaction.atomic
def ask_ai(*, user, content: str, session_id=None, uploaded_files=None, metadata=None) -> dict[str, Any]:
    """Persist a user message, execute AI, and persist the assistant result."""
    session = resolve_session(user, session_id)
    session_log = SessionLog(session.id, user.id)
    user_message = chats.objects.create(
        session=session,
        role="user",
        content=content,
        message_type="file" if uploaded_files else "text",
        metadata=metadata or {},
    )
    files = _save_uploaded_files(user_message, list(uploaded_files or []))
    session_log.write("user_message_created", message_id=user_message.id, content=content, file_count=len(files))
    if files:
        session_log.write("files_attached", files=files)
    task = ai_tasks.objects.create(user=user, session=session, request_message=user_message, request_text=content)
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
        task.result = final.get("result") or {}
        task.network = final.get("network") or (task.result or {}).get("network_report") or {}
        task.model_used = str((task.result or {}).get("model") or (task.result or {}).get("model_used") or "")
        task.error = str(final.get("error") or "")
        task.response_text = _extract_answer(final)
        task.save(update_fields=["status", "result", "network", "model_used", "error", "response_text", "updated_at"])
        for event in client.get_events(submitted.execution_id):
            session_log.write(str(event.get("type") or event.get("event") or "ai_progress"), task_id=task.id, ai_event=event)
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
