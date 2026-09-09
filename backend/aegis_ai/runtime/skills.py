"""Bounded local SKILL.md discovery for specialist agents."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any


DEFAULT_SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"


class SkillCatalog:
    def __init__(self, roots: list[str | Path] | None = None, *, max_bytes: int = 32 * 1024) -> None:
        candidate_roots = list(roots) if roots else [Path.cwd() / "skills", Path.cwd() / ".aegis" / "skills"]
        resolved_candidates = [Path(r).resolve() for r in candidate_roots]
        if DEFAULT_SKILLS_DIR.resolve() not in resolved_candidates:
            resolved_candidates.append(DEFAULT_SKILLS_DIR.resolve())
        self.roots = resolved_candidates
        self.max_bytes = max_bytes

    def list(self) -> list[dict[str, Any]]:
        skills = []
        seen = set()
        for root in self.roots:
            if not root.is_dir():
                continue
            for path in sorted(root.glob("*/SKILL.md")):
                meta = self._metadata(path)
                if meta and meta["name"] not in seen:
                    seen.add(meta["name"])
                    skills.append(meta)
        return skills

    def load(self, name: str) -> dict[str, Any]:
        for item in self.list():
            if item["name"] == name or item["directory"] == name:
                path = Path(item["path"])
                return {**item, "content": path.read_text(encoding="utf-8", errors="replace")[:self.max_bytes]}
        raise KeyError(f"Skill '{name}' is not available")

    def prompt_context(self, names: list[str] | None = None) -> str:
        selected = names or [item["name"] for item in self.list()]
        chunks = []
        for name in selected:
            try:
                skill = self.load(name)
            except KeyError:
                continue
            chunks.append(f"## Skill: {skill['name']}\n{skill['content']}")
        return "\n\n".join(chunks)

    def _metadata(self, path: Path) -> dict[str, Any] | None:
        try:
            content = path.read_text(encoding="utf-8", errors="replace")[:self.max_bytes]
        except OSError:
            return None
        name = self._frontmatter(content, "name") or path.parent.name
        description = self._frontmatter(content, "description") or ""
        return {"name": name, "description": description, "directory": path.parent.name, "path": str(path)}

    @staticmethod
    def _frontmatter(content: str, key: str) -> str:
        if not content.startswith("---"):
            return ""
        match = re.search(rf"^\s*{re.escape(key)}\s*:\s*(.+)$", content[:content.find("\n---", 3) if "\n---" in content[3:] else len(content)], re.MULTILINE)
        return match.group(1).strip().strip("'\"") if match else ""
