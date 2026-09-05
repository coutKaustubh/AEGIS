from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.chats.models import chat_sessions, chats

User = get_user_model()


class ChatSessionOwnershipTests(TestCase):
    """Verify that sessions are scoped to the authenticated user."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="alice", password="alice123!"
        )
        self.user_b = User.objects.create_user(
            username="bob", password="bob123!"
        )

    # ── helpers ──

    def _login(self, user):
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": user.username, "password": user.username + "123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + resp.data["access"]
        )

    # ── session list ──

    def test_list_sessions_returns_only_own(self):
        """User A should not see User B's sessions."""
        chat_sessions.objects.create(user=self.user_a, chat_title="A-session")
        chat_sessions.objects.create(user=self.user_b, chat_title="B-session")

        self._login(self.user_a)
        resp = self.client.get("/api/v1/chats/sessions/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [s["chat_title"] for s in resp.data]
        self.assertIn("A-session", titles)
        self.assertNotIn("B-session", titles)

    # ── session detail access ──

    def test_cannot_access_other_users_session(self):
        """User A must not retrieve User B's session."""
        session_b = chat_sessions.objects.create(
            user=self.user_b, chat_title="private"
        )
        self._login(self.user_a)
        resp = self.client.get(f"/api/v1/chats/sessions/{session_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ── session create ──

    def test_create_session_binds_to_authenticated_user(self):
        self._login(self.user_a)
        resp = self.client.post(
            "/api/v1/chats/sessions/",
            {"chat_title": "my session"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        session = chat_sessions.objects.get(id=resp.data["id"])
        self.assertEqual(session.user, self.user_a)

    # ── session rename ──

    def test_rename_own_session(self):
        self._login(self.user_a)
        session = chat_sessions.objects.create(
            user=self.user_a, chat_title="old name"
        )
        resp = self.client.patch(
            f"/api/v1/chats/sessions/{session.id}/",
            {"chat_title": "docs"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        session.refresh_from_db()
        self.assertEqual(session.chat_title, "docs")

    def test_cannot_rename_other_users_session(self):
        session_b = chat_sessions.objects.create(
            user=self.user_b, chat_title="B title"
        )
        self._login(self.user_a)
        resp = self.client.patch(
            f"/api/v1/chats/sessions/{session_b.id}/",
            {"chat_title": "hacked"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # ── session delete ──

    def test_delete_own_session_cascades_chats(self):
        self._login(self.user_a)
        session = chat_sessions.objects.create(
            user=self.user_a, chat_title="temp"
        )
        chats.objects.create(
            session=session, role="user", content="hello"
        )
        resp = self.client.delete(f"/api/v1/chats/sessions/{session.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(chat_sessions.objects.filter(id=session.id).exists())
        self.assertEqual(chats.objects.filter(session=session).count(), 0)


class ChatCreateTests(TestCase):
    """
    Verify the core create-chat logic:
      • New session flow (no chat_session_id)
      • Existing session flow (chat_session_id provided)
      • Ownership rejection
    """

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="alice", password="alice123!"
        )
        self.user_b = User.objects.create_user(
            username="bob", password="bob123!"
        )

    def _login(self, user):
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": user.username, "password": user.username + "123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + resp.data["access"]
        )

    # ── new session flow ──

    def test_create_chat_without_session_creates_new_session(self):
        self._login(self.user_a)
        resp = self.client.post(
            "/api/v1/chats/",
            {"role": "user", "content": "Hello"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # A new session was created and its ID returned.
        self.assertIn("chat_session_id", resp.data)
        session = chat_sessions.objects.get(id=resp.data["chat_session_id"])
        self.assertEqual(session.user, self.user_a)

    # ── existing session flow ──

    def test_create_chat_with_existing_session(self):
        self._login(self.user_a)
        session = chat_sessions.objects.create(
            user=self.user_a, chat_title="docs"
        )
        resp = self.client.post(
            "/api/v1/chats/",
            {
                "chat_session_id": str(session.id),
                "role": "user",
                "content": "Explain this document",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["chat_session_id"], str(session.id))
        self.assertEqual(chats.objects.filter(session=session).count(), 1)

    # ── ownership rejection ──

    def test_cannot_create_chat_in_other_users_session(self):
        session_b = chat_sessions.objects.create(
            user=self.user_b, chat_title="private"
        )
        self._login(self.user_a)
        resp = self.client.post(
            "/api/v1/chats/",
            {
                "chat_session_id": str(session_b.id),
                "role": "user",
                "content": "hack attempt",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(chats.objects.filter(session=session_b).count(), 0)

    # ── unauthenticated ──

    def test_unauthenticated_request_rejected(self):
        resp = self.client.post(
            "/api/v1/chats/",
            {"role": "user", "content": "no token"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class PersistentSessionTests(TestCase):
    """
    The critical business scenario:
    A user creates a session, sends messages, comes back later,
    and appends to the SAME session. No new session is created.
    """

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="alice", password="alice123!"
        )
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": "alice", "password": "alice123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + resp.data["access"]
        )

    def test_persistent_session_appends_chats(self):
        """
        Simulates:
          Day 1 → create session "docs", send 2 messages.
          Day N → reopen session "docs", send 2 more messages.
          Result → still 1 session, now 4 chats.
        """
        # Day 1: first message creates the session.
        resp1 = self.client.post(
            "/api/v1/chats/",
            {"role": "user", "content": "Explain this document"},
            format="json",
        )
        session_id = resp1.data["chat_session_id"]

        # Day 1: assistant response.
        self.client.post(
            "/api/v1/chats/",
            {
                "chat_session_id": session_id,
                "role": "assistant",
                "content": "The document covers...",
            },
            format="json",
        )

        # ── simulate 10 days later ──

        # Day N: user reopens the same session.
        resp3 = self.client.post(
            "/api/v1/chats/",
            {
                "chat_session_id": session_id,
                "role": "user",
                "content": "Explain section 2",
            },
            format="json",
        )
        self.assertEqual(resp3.status_code, status.HTTP_201_CREATED)
        # Still the same session.
        self.assertEqual(resp3.data["chat_session_id"], session_id)

        # Day N: assistant response.
        self.client.post(
            "/api/v1/chats/",
            {
                "chat_session_id": session_id,
                "role": "assistant",
                "content": "Section 2 explains...",
            },
            format="json",
        )

        # Verify: 1 session, 4 chats.
        self.assertEqual(chat_sessions.objects.count(), 1)
        self.assertEqual(
            chats.objects.filter(session__id=session_id).count(), 4
        )

    def test_chat_history_chronological_order(self):
        """Chats must come back in created_at ASC order."""
        session = chat_sessions.objects.create(
            user=self.user, chat_title="ordered"
        )
        for i, (role, text) in enumerate([
            ("user", "first"),
            ("assistant", "second"),
            ("user", "third"),
        ]):
            chats.objects.create(session=session, role=role, content=text)

        resp = self.client.get(
            f"/api/v1/chats/sessions/{session.id}/chats/"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        contents = [c["content"] for c in resp.data]
        self.assertEqual(contents, ["first", "second", "third"])


class ChatDetailDeleteTests(TestCase):
    """Verify single-chat retrieval and deletion with ownership."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            username="alice", password="alice123!"
        )
        self.user_b = User.objects.create_user(
            username="bob", password="bob123!"
        )

    def _login(self, user):
        resp = self.client.post(
            "/api/v1/auth/login/",
            {"username": user.username, "password": user.username + "123!"},
            format="json",
        )
        self.client.credentials(
            HTTP_AUTHORIZATION="Bearer " + resp.data["access"]
        )

    def test_retrieve_own_chat(self):
        self._login(self.user_a)
        session = chat_sessions.objects.create(
            user=self.user_a, chat_title="test"
        )
        chat = chats.objects.create(
            session=session, role="user", content="hello"
        )
        resp = self.client.get(f"/api/v1/chats/{chat.id}/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["content"], "hello")

    def test_cannot_retrieve_other_users_chat(self):
        session_b = chat_sessions.objects.create(
            user=self.user_b, chat_title="private"
        )
        chat_b = chats.objects.create(
            session=session_b, role="user", content="secret"
        )
        self._login(self.user_a)
        resp = self.client.get(f"/api/v1/chats/{chat_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_own_chat(self):
        self._login(self.user_a)
        session = chat_sessions.objects.create(
            user=self.user_a, chat_title="test"
        )
        chat = chats.objects.create(
            session=session, role="user", content="to delete"
        )
        resp = self.client.delete(f"/api/v1/chats/{chat.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(chats.objects.filter(id=chat.id).exists())

    def test_cannot_delete_other_users_chat(self):
        session_b = chat_sessions.objects.create(
            user=self.user_b, chat_title="private"
        )
        chat_b = chats.objects.create(
            session=session_b, role="user", content="safe"
        )
        self._login(self.user_a)
        resp = self.client.delete(f"/api/v1/chats/{chat_b.id}/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(chats.objects.filter(id=chat_b.id).exists())
