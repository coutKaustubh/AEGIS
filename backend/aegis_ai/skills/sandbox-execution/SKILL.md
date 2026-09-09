---
name: sandbox-execution
description: Process isolation, Bubblewrap sandbox management, cgroup resource constraints, and safe terminal execution.
version: 1.0.0
category: infrastructure
---

# Sandbox Execution Skill

This skill defines the operational boundaries and containment rules for running processes, tests, and tools within AEGIS.

## 1. Execution Sandbox Architecture
- AEGIS executes commands in a strictly isolated local boundary:
  - Process Isolation: Namespaces and Bubblewrap (`bwrap`) prevent container escapes.
  - Filesystem Containment: Processes only have write access to the designated `workspace/` directory. System directories (`/etc`, `/usr`, `/root`) are mounted read-only or masked.
  - Network Air-Gap: Network namespaces (`--unshare-net`) block all egress and ingress sockets during tool execution.
  - Resource Quotas: Linux cgroups enforce memory limits and CPU throttling to prevent runaway executions.

## 2. Command Invocation Protocol
- Call `execute_command` with:
  `{"action": "tool", "tool": "execute_command", "arguments": {"command": "<command>", "cwd": ".", "timeout": 90}}`
- Only allowlisted commands (e.g. `pytest`, `python`, `git`, `cat`, `ls`) are permitted without explicit administrator elevation.
- Shell metacharacters (`rm -rf`, `sudo`, `curl`, `wget`) are intercepted by policy engines and blocked or flagged for human approval.

## 3. Handling Timeouts & Resource Exceeded Errors
- If a command times out (exceeds `timeout` seconds):
  - Check for infinite loops or long-running test suites.
  - Run targeted single tests (e.g., `pytest tests/test_foo.py::test_bar -q`) instead of full suites.
- If memory limit is exceeded (OOM):
  - Stream data in chunks rather than reading entire files into memory.
