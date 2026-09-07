import json
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.chats.ai_client import AIClient, AIServiceError, AIServiceTimeout


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return self.payload


@override_settings(
    AI_SERVICE_URL="http://127.0.0.1:8001",
    AI_SERVICE_TIMEOUT=1,
    AI_TASK_TIMEOUT=1,
    AI_TASK_POLL_INTERVAL=0,
)
class AIClientTests(SimpleTestCase):
    @patch("apps.chats.ai_client.urlopen")
    def test_create_task_uses_contract(self, urlopen):
        urlopen.return_value = FakeResponse({"execution_id": "exec-123", "status": "queued"})

        task = AIClient().create_task(request="Say hello")

        self.assertEqual(task.execution_id, "exec-123")
        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "http://127.0.0.1:8001/api/tasks")
        self.assertEqual(json.loads(request.data), {"request": "Say hello", "files": [], "options": {}})

    @patch("apps.chats.ai_client.urlopen")
    def test_wait_for_task_polls_until_terminal_state(self, urlopen):
        urlopen.side_effect = [
            FakeResponse({"execution_id": "exec-123", "status": "running"}),
            FakeResponse({"execution_id": "exec-123", "status": "success", "result": {"final_answer": "done"}}),
        ]

        result = AIClient().wait_for_task("exec-123")

        self.assertEqual(result["status"], "success")
        self.assertEqual(urlopen.call_count, 2)

    @patch("apps.chats.ai_client.urlopen")
    def test_invalid_service_response_is_reported(self, urlopen):
        urlopen.return_value = FakeResponse({"status": "queued"})

        with self.assertRaises(AIServiceError):
            AIClient().create_task(request="Say hello")

    @patch("apps.chats.ai_client.urlopen")
    @patch("apps.chats.ai_client.time.monotonic", side_effect=[0, 2])
    def test_wait_timeout_is_reported(self, _monotonic, urlopen):
        urlopen.return_value = FakeResponse({"execution_id": "exec-123", "status": "running"})

        with self.assertRaises(AIServiceTimeout):
            AIClient().wait_for_task("exec-123")
