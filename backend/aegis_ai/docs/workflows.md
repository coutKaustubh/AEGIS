# AEGIS Sovereign Workflows Architecture

This document details the end-to-end execution pipelines within the sovereign AEGIS workbench, including plan generation, specialist delegation, human-in-the-loop authorization, self-healing recovery, and session concurrency controls.

---

## 1. Master Orchestration Lifecycle

Every request submitted via the API or CLI proceeds through an air-gapped, state-machine orchestrated lifecycle:

```text
User Request (Untrusted)
       │
       ▼
1. NLP Preprocessing & Entity Sanitization
       │
       ▼
2. Capability Matcher & Tool Allowlisting
       │
       ▼
3. Bounded Planner (Generates minimal ordered steps)
       │
       ▼
4. Plan Validation & Policy Boundary Gate
       │
       ▼
5. Specialist Execution Loop (Reason ⇄ Tool Action)
       │
       ├── LOW-Risk Tools ──► Automated Sandboxed Execution
       │
       └── HIGH-Risk Tools ──► HITL Approval Gate (300s Timeout)
                                     │
                                     ├── Approved ──► Execute Tool
                                     └── Expired / Denied ──► Safe Termination
       │
       ▼
6. Deterministic Read-Back & Verification (Tests / AST / Hash)
       │
       ▼
7. Final Answer Synthesis (Verified Evidence & Artifact Manifest)
```

---

## 2. Coding & Tool Execution Protocol

The coding loop adheres to strict operational contracts:

### A. File Creation Protocol
1. Model identifies requirement to generate a new script or file.
2. Directly invokes `create_file` or `create_python_script` with `path` and complete `content`.
3. Does **NOT** call `read_file` before creation.
4. Reads back the created file with `read_file` to confirm creation and file integrity.

### B. File Editing Protocol
1. **Mandatory Inspection**: Invokes `read_file` to review current file content.
2. **Verbatim Matching**: Selects an exact, unique excerpt as `old_text`.
3. **Atomic Modification**: Calls `edit_file(path, old_text, new_text)`.
4. **Read-Back Verification**: Reads file again to ensure modification applied cleanly without corrupting neighboring lines.

### C. Test Verification
1. Invokes `execute_command` with targeted test commands (e.g. `pytest tests/test_module.py -q`).
2. Evaluates exit code: only exit code 0 is treated as passing.
3. If failure occurs, parses `stderr` / `stdout`, diagnoses root cause, and applies targeted fixes.

---

## 3. Human-in-the-Loop (HITL) Approvals & Automatic Expiration

Operations that mutate files, execute commands, or modify review checkpoints require administrative authorization:

```text
HIGH-Risk Tool Requested (e.g. create_file, execute_command)
                  │
                  ▼
         Generate request_id
         Set status = "pending"
         Set expires_at = now + 300s (5 minutes)
                  │
       ┌──────────┴──────────┐
       │ Dual-Surface Event  │
       ▼                     ▼
Chat Inline Card       Approvals Tab / Page
       │                     │
       ├─────────────────────┤
       ▼                     ▼
[Admin Decision within 300s?]
 ├── YES (Approve) ──► status = "approved", Tool executes synchronously
 ├── YES (Deny)    ──► status = "denied", Tool blocked safely
 └── NO (Timeout)  ──► status = "expired", Auto-expired by background TTL,
                                          Task stops safely without mutation
```

### Expiration Guarantees:
- **FastAPI AI Worker**: Internal `waiter.wait(timeout=300)` automatically sets `status="expired"` upon timeout.
- **Django Database**: Stored in `permission_requests` with `expires_at`. Automated query checks immediately transition any pending records past their deadline to `status="expired"`.
- **Frontend UI**: Renders an alert with an `Expired` badge and clock icon, preventing stale click submissions.

---

## 4. Single-Task Concurrency Control (Session Lock)

To prevent race conditions and conflicting workspace modifications:
- **Rule**: Within any given chat session, only ONE task may execute at any given time.
- **Backend Enforcement**: When `start_ai` or `ask_ai` receives a request, it checks whether any task with `status__in=["queued", "running"]` exists in the session. If active, it raises a `TaskConflictError` and returns `HTTP 409 Conflict`.
- **Frontend Enforcement**: While a task is active or awaiting approval, the chat textarea and Send button are disabled, and an in-flight status banner is displayed.
