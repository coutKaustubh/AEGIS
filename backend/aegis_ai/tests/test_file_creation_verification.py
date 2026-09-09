from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock
from runtime.agents import (
    OllamaSpecialistAgent,
    AgentDescriptor,
    AgentCapability,
    AgentRequest,
    AgentResult,
    AgentStatus,
)
from runtime.task_graph import run_task_graph, TaskStatus
from tools.workspace import WorkspaceReadTools


@pytest.mark.asyncio
async def test_fibonacci_deterministic_creation(tmp_path: Path) -> None:
    provider = MagicMock()
    ws_file = tmp_path / "fibonacci.py"
    # Even if pre-existing file exists, it should overwrite cleanly and succeed
    ws_file.write_text("old broken code", encoding="utf-8")
    ws_tools = WorkspaceReadTools(tmp_path, approver=lambda *_: True)

    agent = OllamaSpecialistAgent(
        AgentDescriptor(
            name="coding_agent",
            role="coding",
            capabilities=[AgentCapability.CODING],
            provider_name="stub",
            allowed_tools=["create_python_script", "read_file"],
        ),
        provider,
        tools={"create_python_script": ws_tools.create_python_script},
    )
    result = await agent.run(AgentRequest(
        task="create a file on fibonacci.py",
        context={"workspace_root": str(tmp_path)},
    ))
    assert result.status == AgentStatus.SUCCESS
    assert "fibonacci.py" in result.artifacts or any("fibonacci.py" in str(a) for a in result.artifacts)
    assert ws_file.exists()
    assert "def fibonacci" in ws_file.read_text(encoding="utf-8")
    assert result.verification.get("status") == "passed"


@pytest.mark.asyncio
async def test_answer_code_recovery_when_model_returns_final(tmp_path: Path) -> None:
    provider = MagicMock()
    import json
    answer_with_code = "Here is the code:\n```python\ndef fibonacci(n):\n    return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)\n```\n"
    provider.generate = AsyncMock(return_value=MagicMock(content=json.dumps({"action": "final", "answer": answer_with_code})))
    ws_tools = WorkspaceReadTools(tmp_path, approver=lambda *_: True)

    agent = OllamaSpecialistAgent(
        AgentDescriptor(
            name="coding_agent",
            role="coding",
            capabilities=[AgentCapability.CODING],
            provider_name="stub",
            allowed_tools=["create_python_script", "read_file"],
        ),
        provider,
        tools={"create_python_script": ws_tools.create_python_script, "read_file": ws_tools.read_file},
    )
    result = await agent.run(AgentRequest(
        task="create fib_algo.py for me",
        context={"workspace_root": str(tmp_path), "path": "fib_algo.py"},
    ))
    assert result.status == AgentStatus.SUCCESS
    assert any("fib_algo.py" in str(a) for a in result.artifacts)
    created = tmp_path / "fib_algo.py"
    assert created.exists()
    assert "def fibonacci" in created.read_text(encoding="utf-8")


@pytest.mark.asyncio
async def test_failed_task_returns_no_artifacts(tmp_path: Path) -> None:
    provider = MagicMock()
    # Model repeatedly makes invalid actions
    provider.generate = AsyncMock(return_value=MagicMock(content='not valid json at all'))

    agent = OllamaSpecialistAgent(
        AgentDescriptor(
            name="coding_agent",
            role="coding",
            capabilities=[AgentCapability.CODING],
            provider_name="stub",
            allowed_tools=["read_file"],
        ),
        provider,
        tools={"read_file": lambda p: {"ok": True, "content": "print('hello')"}},
    )
    result = await agent.run(AgentRequest(
        task="inspect test.py and report",
        context={"workspace_root": str(tmp_path), "path": "test.py"},
    ))
    assert result.status == AgentStatus.FAILURE
    assert result.artifacts == []


@pytest.mark.asyncio
async def test_task_graph_safe_failure_clears_artifacts_and_deduplicates_errors():
    from tests.test_task_graph import _Master
    result = AgentResult(
        agent="coding_agent",
        status=AgentStatus.FAILURE,
        summary="file generation unverified",
        errors=["file_generation_unverified", "file_generation_unverified"],
        artifacts=["leak.py"],
    )
    state = await run_task_graph(_Master(result), "create py file", workspace_root=".", max_task_retries=1)
    assert state["status"] == "failed"
    assert state["artifacts"] == []
    assert state["final_answer"].count("file_generation_unverified") == 1
