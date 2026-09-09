import json
from uuid import uuid4

from django.test import SimpleTestCase

from .response_contract import canonicalize


class CanonicalResponseTests(SimpleTestCase):
    def test_fenced_json_is_normalized(self):
        result = canonicalize('prefix\n```json\n{"answer":"ok"}\n```\nsuffix', uuid4())
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["response"]["content"], "ok")
        self.assertEqual(result["schema_version"], "1.0")

    def test_malformed_output_gets_safe_error_envelope(self):
        result = canonicalize({"response": None}, uuid4())
        self.assertEqual(result["status"], "error")
        self.assertEqual(result["metadata"]["error_code"], "INVALID_MODEL_RESPONSE")

    def test_canonical_payload_has_required_fields(self):
        request_id = uuid4()
        result = canonicalize({"schema_version": "1.0", "status": "success", "request_id": str(request_id), "agent": "master", "intent": "general_qa", "response": {"type": "text", "content": "ok"}, "tool_calls": [], "artifacts": [], "metadata": {}}, request_id)
        self.assertEqual(result["request_id"], str(request_id))
