"""HTTP client for the local AEGIS AI service.

The Django application talks to the AI runtime only through this module.  The
client deliberately uses the Python standard library so the Windows backend
does not acquire an extra HTTP dependency just to reach the local service.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class AIServiceError(RuntimeError):
    """Raised when the AI service cannot be reached or returns an error."""


class AIServiceTimeout(AIServiceError):
    """Raised when an AI execution does not finish within the configured time."""


@dataclass(frozen=True)
class AITask:
    execution_id: str
    status: str


class AIClient:
    """Small, synchronous client for the local FastAPI task API."""

    def __init__(self, base_url: str | None = None, timeout: float | None = None) -> None:
        self.base_url = (base_url or settings.AI_SERVICE_URL).rstrip("/")
        self.timeout = float(timeout if timeout is not None else settings.AI_SERVICE_TIMEOUT)

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/api/health")

    def create_task(
        self,
        *,
        request: str,
        files: list[dict[str, str]] | None = None,
        options: dict[str, Any] | None = None,
    ) -> AITask:
        payload = {
            "request": request,
            "files": files or [],
            "options": options or {},
        }
        response = self._request("POST", "/api/tasks", payload)
        try:
            return AITask(
                execution_id=str(response["execution_id"]),
                status=str(response.get("status", "queued")),
            )
        except (KeyError, TypeError) as exc:
            raise AIServiceError("AI service returned an invalid task response") from exc

    def get_task(self, execution_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/tasks/{execution_id}")

    def approve_permission(self, execution_id: str, request_id: str, reason: str = "") -> dict[str, Any]:
        return self._request("POST", f"/api/tasks/{execution_id}/permissions/{request_id}/approve", {"reason": reason})

    def deny_permission(self, execution_id: str, request_id: str, reason: str = "") -> dict[str, Any]:
        return self._request("POST", f"/api/tasks/{execution_id}/permissions/{request_id}/deny", {"reason": reason})

    def get_network(self, execution_id: str) -> dict[str, Any]:
        return self._request("GET", f"/api/tasks/{execution_id}/network")

    def get_events(self, execution_id: str) -> list[dict[str, Any]]:
        """Read the AI service's completed SSE event stream into JSON events."""
        raw = self._request_text("GET", f"/api/tasks/{execution_id}/events")
        events = []
        for line in raw.splitlines():
            if not line.startswith("data:"):
                continue
            try:
                value = json.loads(line[5:].strip())
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                events.append(value)
        return events

    def wait_for_task(self, execution_id: str, *, timeout: float | None = None, on_update=None) -> dict[str, Any]:
        """Poll a task for synchronous callers such as the first chat slice."""
        deadline = time.monotonic() + float(timeout if timeout is not None else settings.AI_TASK_TIMEOUT)
        interval = float(settings.AI_TASK_POLL_INTERVAL)
        while True:
            task = self.get_task(execution_id)
            if on_update is not None:
                on_update(task)
            if task.get("status") in {"success", "failed", "cancelled"}:
                return task
            if time.monotonic() >= deadline:
                raise AIServiceTimeout(f"AI task {execution_id} did not finish in time")
            time.sleep(interval)

    def _request(self, method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        raw = self._request_text(method, path, payload)
        try:
            result = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise AIServiceError("AI service returned invalid JSON") from exc
        if not isinstance(result, dict):
            raise AIServiceError("AI service returned an invalid JSON object")
        return result

    def _request_text(self, method: str, path: str, payload: dict[str, Any] | None = None) -> str:
        body = None
        headers = {"Accept": "application/json"}
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = Request(f"{self.base_url}{path}", data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:500]
            raise AIServiceError(f"AI service returned HTTP {exc.code}: {detail}") from exc
        except (URLError, TimeoutError, OSError) as exc:
            raise AIServiceError(f"AI service is unavailable: {exc}") from exc
        return raw
