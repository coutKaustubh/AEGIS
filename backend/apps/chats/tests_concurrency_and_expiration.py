from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.chats.models import ai_tasks, chat_sessions, permission_requests
from apps.chats.services import TaskConflictError, start_ai, recover_stale_tasks, cancel_task
from apps.chats.views import expire_stale_permissions

User = get_user_model()


class ConcurrencyAndExpirationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password123")
        self.session = chat_sessions.objects.create(user=self.user, chat_title="Test Session")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_single_task_concurrency_raises_conflict(self):
        # Create an active task in the session
        ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Task 1",
            status="running",
        )

        # Attempting to start another task in the same session must raise TaskConflictError
        with self.assertRaises(TaskConflictError):
            start_ai(user=self.user, content="Task 2", session_id=str(self.session.id))

    def test_chat_ask_api_returns_409_on_active_task_conflict(self):
        ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Task 1",
            status="queued",
        )

        response = self.client.post("/api/v1/chats/ask/", {
            "content": "Task 2",
            "chat_session_id": str(self.session.id),
        })

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get("error"), "task_conflict")

    def test_auto_expire_stale_permissions(self):
        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Task with permission",
            status="running",
        )
        # Create a pending permission that was created 350 seconds ago
        past_time = timezone.now() - timedelta(seconds=350)
        perm = permission_requests.objects.create(
            request_id="perm-stale-1",
            task=task,
            user=self.user,
            action="edit_file",
            status="pending",
            expires_at=past_time + timedelta(seconds=300),
        )
        # Update created_at in the past
        permission_requests.objects.filter(id=perm.id).update(created_at=past_time)

        # Run expiration check
        expire_stale_permissions()

        perm.refresh_from_db()
        self.assertEqual(perm.status, "expired")
        self.assertIn("expired", perm.decision_reason)

    def test_decision_on_expired_permission_returns_409(self):
        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Task",
            status="running",
        )
        perm = permission_requests.objects.create(
            request_id="perm-expired-1",
            task=task,
            user=self.user,
            action="create_file",
            status="expired",
            decision_reason="Approval request expired after timeout",
        )

        response = self.client.post(
            f"/api/v1/chats/tasks/{task.id}/permissions/{perm.request_id}/approve/",
            {"reason": "Testing approve"},
        )
        self.assertEqual(response.status_code, 409)
        self.assertIn("expired", response.data.get("detail", ""))

    def test_recover_stale_tasks(self):
        past_time = timezone.now() - timedelta(seconds=200)
        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Stale Task",
            status="running",
        )
        ai_tasks.objects.filter(id=task.id).update(updated_at=past_time)
        perm = permission_requests.objects.create(
            request_id="perm-stale-2",
            task=task,
            user=self.user,
            action="execute_command",
            status="pending",
        )

        recovered = recover_stale_tasks(session=self.session, max_age_seconds=120)
        self.assertIn(str(task.id), recovered)

        task.refresh_from_db()
        self.assertEqual(task.status, "failed")
        self.assertIn("timed out", task.error.lower())
        self.assertIsNotNone(task.assistant_message)

        perm.refresh_from_db()
        self.assertEqual(perm.status, "expired")

    @patch("apps.chats.services._execute_task")
    def test_stale_task_does_not_block_new_ai_task(self, mock_exec):
        past_time = timezone.now() - timedelta(seconds=200)
        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Dead Task",
            status="running",
        )
        ai_tasks.objects.filter(id=task.id).update(updated_at=past_time)

        # start_ai should auto-recover the stale task and succeed without conflict
        res = start_ai(user=self.user, content="New Task", session_id=str(self.session.id))
        self.assertIsNotNone(res.get("task"))
        self.assertEqual(res["task"].request_text, "New Task")

        task.refresh_from_db()
        self.assertEqual(task.status, "failed")

    def test_cancel_task_api(self):
        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Active Task to Cancel",
            status="running",
        )
        perm = permission_requests.objects.create(
            request_id="perm-cancel-1",
            task=task,
            user=self.user,
            action="create_file",
            status="pending",
        )

        response = self.client.post(f"/api/v1/chats/tasks/{task.id}/cancel/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get("status"), "cancelled")

        task.refresh_from_db()
        self.assertEqual(task.status, "cancelled")
        self.assertIn("cancelled", task.error.lower())

        perm.refresh_from_db()
        self.assertEqual(perm.status, "denied")

    @patch("apps.chats.services.AIClient")
    def test_worker_heartbeat_keeps_active_task_alive(self, mock_client_cls):
        from apps.chats.services import _execute_task
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client
        mock_client.create_task.return_value = MagicMock(execution_id="exec-hb-1", status="running")
        mock_client.get_events.return_value = []

        task = ai_tasks.objects.create(
            user=self.user,
            session=self.session,
            request_text="Heartbeat Task",
            status="queued",
        )
        original_updated_at = timezone.now() - timedelta(seconds=250)
        ai_tasks.objects.filter(id=task.id).update(updated_at=original_updated_at)

        # Simulate wait_for_task invoking on_update callbacks with delay
        simulated_time = [100.0]
        def fake_wait(execution_id, on_update=None):
            if on_update:
                with patch("apps.chats.services.time.monotonic", side_effect=lambda: simulated_time[0]):
                    simulated_time[0] += 5.0
                    on_update({"status": "running", "events": []})
            return {"status": "success", "result": {"content": "ok"}}

        mock_client.wait_for_task.side_effect = fake_wait

        _execute_task(str(task.id))

        task.refresh_from_db()
        self.assertEqual(task.error, "")
        self.assertEqual(task.status, "success")
        self.assertGreater(task.updated_at, original_updated_at)

