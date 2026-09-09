from types import SimpleNamespace

import pytest

from runtime.agents import AgentCapability, AgentDescriptor, AgentRegistry, BaseAgent, MasterAgent
from runtime.lightweight_router import LightweightTaskRouter
from models.base import ModelResponse


class _Provider:
    async def generate(self, prompt: str, **kwargs):
        self.prompt = prompt
        return ModelResponse(
            content='{"task_type":"coding","agent":"coder","modality":"text","complexity":"simple",'
            '"enhanced_request":"Create a Python red-black tree module with tests.",'
            '"objective":"Implement and verify the requested module.",'
            '"success_criteria":["source read back","tests pass"],"required_tools":["read_file","create_file"],'
            '"assumptions":[],"confidence":0.96}', model="small"
        )


class _Agent(BaseAgent):
    descriptor = AgentDescriptor(name="coder", role="coding", capabilities=[AgentCapability.CODING], provider_name="local")

    async def run(self, request):
        raise AssertionError("not called")


@pytest.mark.asyncio
async def test_lightweight_router_returns_structured_classification():
    router = LightweightTaskRouter(_Provider(), agent_capabilities={"coder": ["coding"]})
    result = await router.classify("create py file about rb trees")
    assert result.agent == "coder"
    assert result.enhanced_request.startswith("Create a Python")


@pytest.mark.asyncio
async def test_master_routes_directly_without_lightweight_handoff():
    registry = AgentRegistry()
    registry.register(_Agent())
    master = MasterAgent(registry, lightweight_router_provider=_Provider())
    plan = await master.route_request("create py file about rb trees")
    assert plan[0]["agent"] == "coding_agent"
    assert plan[0]["routing_source"] == "master_agent"
    assert plan[0]["task"] == "create py file about rb trees"


@pytest.mark.asyncio
async def test_short_request_returns_to_general_master_path():
    master = MasterAgent(AgentRegistry(), lightweight_router_provider=_Provider())
    plan = await master.route_request("hi")
    assert plan[0]["agent"] == "general_agent"
    assert plan[0]["routing_source"] == "master_agent"


def test_attached_pdf_overrides_short_lightweight_route():
    master = MasterAgent(AgentRegistry())
    plan = master._capability_plan("explain", context={"input_path": "/tmp/h.pdf"})
    assert plan[0]["agent"] == "document_agent"
    assert plan[0]["capability"] == "document_analysis"


def test_attached_image_overrides_short_lightweight_route():
    master = MasterAgent(AgentRegistry())
    plan = master._capability_plan("?", context={"image_paths": ["/tmp/diagram.png"]})
    assert plan[0]["agent"] == "vision_agent"


def test_image_filename_does_not_fall_through_to_lightweight_route():
    master = MasterAgent(AgentRegistry())
    request = "?? valid__images__single-images-of-all-valve-symbol-in-p-id_65_png_jpg.rf.a482d2528b25ad71e62a41727c10d681.jpg"
    plan = master._capability_plan(request)
    assert plan[0]["agent"] == "vision_agent"
