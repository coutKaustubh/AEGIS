---
name: policy-and-security
description: Human-in-the-loop authorization, security policies, read/write boundaries, and air-gap integrity for AEGIS agents.
version: 1.0.0
category: security
---

# Policy and Security Skill

This skill defines the security boundaries, policy gates, and human authorization protocols governing all operations in the AEGIS sovereign workbench.

## 1. Risk Tier Classification
- **LOW Risk (Auto-approved)**:
  - Read-only filesystem operations: `read_file`, `list_directory`, `tree`, `find_files`, `search_files`, `get_file_info`.
  - Read-only VCS operations: `git_status`, `git_diff`.
  - Deterministic calculations: `calculator`.
  - Local document parsing and OCR: `list_documents`, `extract_document_text`, `inspect_document_metadata`.
- **HIGH Risk (Requires Human-in-the-Loop Approval)**:
  - Filesystem mutations: `create_file`, `create_python_script`, `edit_file`.
  - Checkpoint restoration: `restore_checkpoint`.
  - Shell command execution: `execute_command`.
- **CRITICAL Risk (Disabled by Default)**:
  - File deletions: `delete_file`.
  - Unrestricted shell commands and arbitrary network requests: `curl`, `wget`, `ssh`.
  - Git commits/pushes: `git_commit`, `git_push`.

## 2. Approval Request Handling & Expiration
- When a HIGH-risk action is requested:
  - The runtime halts execution and emits a `permission_required` event with a unique `request_id`.
  - The request is presented to administrators via the Chat inline approval card and the Approvals tab.
  - A 300-second (5 minute) TTL timer is started.
  - If approved before expiry, the tool proceeds synchronously.
  - If the 300-second TTL expires without an administrative decision, the permission request automatically transitions to `expired` status, and the operation terminates safely without performing unverified mutations.

## 3. Air-Gap Defense
- AEGIS models and tool loops operate under strict network isolation.
- Models must never attempt socket connections, HTTP requests, or external telemetry callbacks.
