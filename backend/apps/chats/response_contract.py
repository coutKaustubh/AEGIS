"""Canonical boundary for untrusted model output."""
import json
import re
import uuid
from rest_framework import serializers


class CanonicalResponseSerializer(serializers.Serializer):
    schema_version = serializers.CharField()
    status = serializers.ChoiceField(choices=["success", "error"])
    request_id = serializers.UUIDField()
    agent = serializers.CharField()
    intent = serializers.CharField()
    response = serializers.DictField()
    tool_calls = serializers.ListField()
    artifacts = serializers.ListField()
    metadata = serializers.DictField()


def _extract_json(value):
    if isinstance(value, dict): return value
    if not isinstance(value, str): return None
    text = value.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.I | re.S).strip()
    try: return json.loads(text)
    except json.JSONDecodeError: pass
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        try: return json.loads(text[start:end + 1])
        except json.JSONDecodeError: return None
    return None


def canonicalize(raw, request_id=None, *, agent="master", intent="unknown"):
    request_id = str(request_id or uuid.uuid4())
    candidate = _extract_json(raw)
    if isinstance(candidate, dict) and {"schema_version", "status", "request_id", "agent", "intent", "response", "tool_calls", "artifacts", "metadata"}.issubset(candidate):
        payload = candidate.copy()
        payload["request_id"] = request_id
    else:
        content = ""
        if isinstance(candidate, dict):
            content = candidate.get("final_answer") or candidate.get("answer") or candidate.get("content") or candidate.get("result")
        if not content and isinstance(raw, str): content = raw.strip()
        if isinstance(content, (dict, list)): content = json.dumps(content, default=str)
        if content:
            payload = {"schema_version": "1.0", "status": "success", "request_id": request_id, "agent": agent, "intent": intent, "response": {"type": "text", "content": str(content)}, "tool_calls": [], "artifacts": [], "metadata": {"normalized": True}}
        else:
            payload = {"schema_version": "1.0", "status": "error", "request_id": request_id, "agent": agent, "intent": intent, "response": {"type": "text", "content": "The model returned an invalid response format."}, "tool_calls": [], "artifacts": [], "metadata": {"error_code": "INVALID_MODEL_RESPONSE"}}
    serializer = CanonicalResponseSerializer(data=payload)
    if serializer.is_valid():
        validated = serializer.validated_data
        validated["request_id"] = str(validated["request_id"])
        return validated
    return {"schema_version": "1.0", "status": "error", "request_id": request_id, "agent": agent, "intent": intent, "response": {"type": "text", "content": "The model returned an invalid response format."}, "tool_calls": [], "artifacts": [], "metadata": {"error_code": "INVALID_MODEL_RESPONSE", "validation_errors": serializer.errors}}
