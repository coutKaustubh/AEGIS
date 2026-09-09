---
name: python-development
description: Sovereign Python development guidelines for creating, modifying, testing, and verifying Python code within AEGIS.
version: 1.0.0
category: engineering
---

# Python Development Skill

This skill governs all Python engineering tasks executed within the AEGIS workbench. It defines strict standards for creating new scripts, modifying existing modules, writing tests, and deterministically verifying execution.

## 1. File Creation Protocol
- When asked to write a new Python script or module:
  - Call `create_file` or `create_python_script` with `{"path": "<relative_path>", "content": "<valid_python_code>"}`.
  - Do NOT call `read_file` prior to writing a new file. New files do not exist yet.
  - Include clean, idiomatic Python 3.12+ code with type annotations and docstrings.
  - Ensure all functions and classes are self-contained or import only standard library or allowed packages.

## 2. File Editing Protocol
- When asked to fix, refactor, or enhance an existing Python file:
  - Step 1: ALWAYS call `read_file(path)` first to examine the exact code and formatting.
  - Step 2: Identify the exact lines to modify. In `edit_file(path, old_text, new_text)`, `old_text` MUST be an exact, unique verbatim substring from the read output.
  - Step 3: Include adequate context lines in `old_text` if the target snippet is short to ensure uniqueness.
  - Step 4: Call `read_file(path)` again after editing to verify the change was applied properly.

## 3. Verification & Self-Testing Protocol
- After creating or editing code:
  - If a test file exists or the task specifies testing, run pytest using `execute_command`:
    `{"action": "tool", "tool": "execute_command", "arguments": {"command": "pytest -q <test_path>", "cwd": "."}}`
  - If no test file exists, either create a corresponding unit test file (e.g., `tests/test_<module>.py`) and run it, or execute a fast syntax/import check:
    `{"action": "tool", "tool": "execute_command", "arguments": {"command": "python3 -m py_compile <path>", "cwd": "."}}`
  - Only mark the task `verified` when tests pass (exit code 0).

## 4. Error Recovery & Self-Healing
- If `edit_file` fails with `OldTextNotFound`:
  - Re-read the file with `read_file` to capture exact indentation (tabs vs spaces) and newline characters.
- If `read_file` fails with `NotFile`:
  - Call `find_files({"pattern": "*.py", "path": "."})` or `list_directory` to confirm the exact file name and directory location.
- If `execute_command` fails with syntax or runtime errors:
  - Carefully read `stderr` and `stdout`.
  - Locate the exact line number reported in the traceback.
  - Use `edit_file` to fix the bug, then re-run the verification command.
