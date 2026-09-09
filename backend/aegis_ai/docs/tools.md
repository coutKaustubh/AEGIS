# AEGIS Tool Architecture and Schema Reference

This document provides the definitive reference for all tools registered in the sovereign AEGIS workbench (`tools/registry.py`, `tools/workspace.py`, `tools/documents.py`, `tools/vision.py`). Every tool operates within the bounded workspace boundary, returns structured JSON responses, and adheres to strict permission policies.

---

## 1. Tool Taxonomy & Registry Contracts

Every tool is managed through the central `ToolRegistry` and exposes:
- **LangChain `@tool` binding**: Formatted input schemas (`args_schema`) compatible with local LLMs (Ollama, vLLM, llama.cpp).
- **Risk Level**: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- **Policy Enforcement**: Automatic enforcement of read/write boundaries, mutation quotas, and air-gap network locks.
- **Human-in-the-Loop Gate**: HIGH-risk operations require explicit administrative approval.

---

## 2. Workspace Engineering Tools (`tools/workspace.py`)

### `create_file(path: str, content: str)`
- **Category**: Code / Mutation
- **Risk Level**: HIGH (Requires HITL approval)
- **Description**: Creates a new text file inside the controlled workspace. Creates parent directories automatically.
- **Parameters**:
  - `path` (string, required): Relative path inside `workspace/`.
  - `content` (string, required): Full content to write.
- **Usage Rule**: Invoke directly when creating a new file from scratch. Never call `read_file` before writing a file that does not yet exist.
- **Example**:
  ```json
  {"action": "tool", "tool": "create_file", "arguments": {"path": "src/math_utils.py", "content": "def add(a, b):\n    return a + b\n"}}
  ```

### `create_python_script(path: str, content: str)`
- **Category**: Code / Mutation
- **Risk Level**: HIGH (Requires HITL approval)
- **Description**: Creates an approved Python script within the workspace. Validates Python syntax prior to persistence.
- **Parameters**:
  - `path` (string, required): Relative path ending in `.py`.
  - `content` (string, required): Python source code.
- **Usage Rule**: Ideal for script generation, utility modules, and unit test suites.
- **Example**:
  ```json
  {"action": "tool", "tool": "create_python_script", "arguments": {"path": "fibonacci.py", "content": "def fib(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)\n"}}
  ```

### `read_file(path: str)`
- **Category**: Filesystem / Inspection
- **Risk Level**: LOW (Auto-approved)
- **Description**: Reads up to 64 KiB of text from a file inside the controlled workspace.
- **Parameters**:
  - `path` (string, required): Relative file path.
- **Usage Rule**: Mandatory prior to calling `edit_file`. Also used post-write to verify newly created files exist and match requirements.
- **Example**:
  ```json
  {"action": "tool", "tool": "read_file", "arguments": {"path": "fibonacci.py"}}
  ```

### `edit_file(path: str, old_text: str, new_text: str)`
- **Category**: Code / Mutation
- **Risk Level**: HIGH (Requires HITL approval)
- **Description**: Replaces a single exact verbatim occurrence of `old_text` with `new_text`.
- **Parameters**:
  - `path` (string, required): Relative path of existing file.
  - `old_text` (string, required): Exact snippet to be replaced. Must be unique in the file.
  - `new_text` (string, required): Replacement snippet.
- **Usage Rule**: You MUST read the file with `read_file` first to obtain the exact `old_text`. If `old_text` does not match verbatim or appears more than once, the edit is aborted.
- **Example**:
  ```json
  {"action": "tool", "tool": "edit_file", "arguments": {"path": "src/math_utils.py", "old_text": "return a + b", "new_text": "return int(a) + int(b)"}}
  ```

### `execute_command(command: str, cwd: str = ".", timeout: int = 90)`
- **Category**: Process / Execution
- **Risk Level**: HIGH (Requires HITL approval)
- **Description**: Executes an allowlisted shell command within the Bubblewrap/cgroup-isolated sandbox.
- **Parameters**:
  - `command` (string, required): Allowed command (e.g. `pytest tests/`, `python -m py_compile module.py`).
  - `cwd` (string, optional, default: `.`): Working directory relative to workspace root.
  - `timeout` (integer, optional, default: 90): Execution timeout in seconds.
- **Usage Rule**: Used for running automated tests, linting, and compile verification. Shell commands attempting network access or privilege escalation are blocked.
- **Example**:
  ```json
  {"action": "tool", "tool": "execute_command", "arguments": {"command": "pytest tests/test_math.py -q", "cwd": "."}}
  ```

### `list_directory(path: str = ".")`
- **Category**: Filesystem / Inspection
- **Risk Level**: LOW (Auto-approved)
- **Description**: Lists files and subdirectories up to 200 entries with metadata (size, modified time).
- **Parameters**:
  - `path` (string, optional, default: `.`): Relative directory path.

### `tree(path: str = ".", max_depth: int = 8, max_entries: int = 1000)`
- **Category**: Filesystem / Inspection
- **Risk Level**: LOW (Auto-approved)
- **Description**: Returns recursive structural hierarchy of files and directories without reading content.

### `find_files(pattern: str, path: str = ".")`
- **Category**: Filesystem / Search
- **Risk Level**: LOW (Auto-approved)
- **Description**: Discovers files matching a glob pattern (e.g. `*.py`, `test_*.py`). Used for error recovery when paths are uncertain.

### `search_files(query: str, path: str = ".")`
- **Category**: Filesystem / Search
- **Risk Level**: LOW (Auto-approved)
- **Description**: Full-text regex/literal substring search across workspace files up to 100 matches.

### `get_file_info(path: str)`
- **Category**: Filesystem / Inspection
- **Risk Level**: LOW (Auto-approved)
- **Description**: Returns file metadata, size, permissions, and SHA-256 hash.

### `git_status()`, `git_diff()`
- **Category**: Version Control / Verification
- **Risk Level**: LOW (Auto-approved)
- **Description**: Read-only Git status and unified diff summary of workspace changes.

### `create_checkpoint(label: str = "checkpoint")`, `restore_checkpoint(checkpoint_id: str)`
- **Category**: Checkpoints / Rollback
- **Risk Level**: `create_checkpoint` is LOW; `restore_checkpoint` is HIGH (modifies files).
- **Description**: Snapshots workspace state before major operations to allow deterministic rollbacks.

---

## 3. Document Intelligence Tools (`tools/documents.py`)

### `list_documents(path: str = ".")`
- **Category**: Documents
- **Risk Level**: LOW
- **Description**: Identifies all PDF, DOCX, TXT, and Markdown documents available for analysis.

### `inspect_document_metadata(path: str)`
- **Category**: Documents
- **Risk Level**: LOW
- **Description**: Extracts title, page count, author, creation timestamp, and format specifications.

### `extract_document_text(path: str)`
- **Category**: Documents
- **Risk Level**: LOW
- **Description**: Extracts full text content using native text extractors or OCR fallback.

### `search_documents(query: str, path: str = ".")`
- **Category**: Documents
- **Risk Level**: LOW
- **Description**: Performs keyword search across all indexed documents in the workspace.

### `read_document_section(path: str, section: str)`
- **Category**: Documents
- **Risk Level**: LOW
- **Description**: Extracts a targeted chapter or heading section from a document.

---

## 4. Vision Tools (`tools/vision.py`)

### `analyze_image(path: str)`
- **Category**: Vision
- **Risk Level**: LOW
- **Description**: Analyzes local image files, diagrams, UI mockups, and charts using local vision models.

### `compare_images(path_a: str, path_b: str)`
- **Category**: Vision
- **Risk Level**: LOW
- **Description**: Computes visual diffs between two image artifacts.

---

## 5. Risk Matrix & Approval Policies

| Tool Name | Risk Tier | Requires Human Approval? | Timeout | Reversible |
| :--- | :--- | :--- | :--- | :--- |
| `read_file` | LOW | No | 10s | Yes |
| `list_directory` | LOW | No | 10s | Yes |
| `tree` | LOW | No | 15s | Yes |
| `find_files` | LOW | No | 15s | Yes |
| `search_files` | LOW | No | 20s | Yes |
| `get_file_info` | LOW | No | 5s | Yes |
| `git_status` / `git_diff` | LOW | No | 10s | Yes |
| `list_documents` | LOW | No | 10s | Yes |
| `extract_document_text` | LOW | No | 30s | Yes |
| `analyze_image` | LOW | No | 30s | Yes |
| `create_file` | HIGH | **Yes** (300s TTL) | 15s | Yes (Checkpoint) |
| `create_python_script`| HIGH | **Yes** (300s TTL) | 15s | Yes (Checkpoint) |
| `edit_file` | HIGH | **Yes** (300s TTL) | 15s | Yes (Checkpoint) |
| `execute_command` | HIGH | **Yes** (300s TTL) | 90s | No |
| `restore_checkpoint` | HIGH | **Yes** (300s TTL) | 30s | Yes |
| `delete_file` | CRITICAL | **Disabled** | N/A | No |
| `web_search` / `curl` | CRITICAL | **Disabled** (Air-Gap) | N/A | N/A |
