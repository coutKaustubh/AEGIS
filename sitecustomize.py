"""Make the bundled AI runtime importable from the repository root.

The Django project and the standalone runtime are intentionally kept in
separate directories, but subprocesses launched from the repository root (for
example acceptance tests and local worker helpers) still need the same module
resolution as ``backend/aegis_ai/cli.py``.
"""
from pathlib import Path
import sys

_runtime_root = Path(__file__).resolve().parent / "backend" / "aegis_ai"
if _runtime_root.is_dir() and str(_runtime_root) not in sys.path:
    sys.path.insert(0, str(_runtime_root))
