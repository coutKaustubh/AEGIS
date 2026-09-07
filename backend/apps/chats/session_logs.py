"""Append-only JSONL session logs for auditability and debugging."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from django.conf import settings


class SessionLog:
    """Writes one readable JSON object per event for one chat session."""

    def __init__(self, session_id: str, user_id: str | None = None):
        root = Path(settings.SESSION_LOG_DIR).resolve()
        root.mkdir(parents=True, exist_ok=True)
        self.session_id = str(session_id)
        self.user_id = str(user_id) if user_id is not None else None
        self.path = root / f"session_{self.session_id}.jsonl"

    def write(self, event: str, *, task_id: str | None = None, **metadata: Any) -> None:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": event,
            "session_id": self.session_id,
            "user": self.user_id,
            "task_id": task_id,
            "metadata": metadata,
            "error": None,
        }
        try:
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")
        except OSError:
            # Logging must never make a chat request fail.
            return
