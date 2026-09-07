from rest_framework import generics, status
import json
import time
from pathlib import Path

from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated

from apps.chats.models import ai_tasks, artifacts, chat_sessions, chats
from apps.chats.serializers import (
    ChatSerializer,
    ChatSessionListSerializer,
    ChatSessionDetailSerializer,
    CreateChatSerializer,
    AITaskSerializer,
    ArtifactSerializer,
    AskChatSerializer,
)
from apps.chats.services import ask_ai, start_ai


# ──────────────────────────────────────────────
#  ChatSession views
# ──────────────────────────────────────────────

class ChatSessionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/chats/sessions/          → list authenticated user's sessions
    POST /api/v1/chats/sessions/          → create a new empty session
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChatSessionListSerializer

    def get_queryset(self):
        # Only return sessions belonging to the authenticated user.
        return chat_sessions.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Bind the new session to the authenticated user.
        serializer.save(user=self.request.user)


class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/chats/sessions/<id>/   → retrieve session + its chats
    PATCH  /api/v1/chats/sessions/<id>/   → update chat_title
    DELETE /api/v1/chats/sessions/<id>/   → delete session (cascades chats)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChatSessionDetailSerializer
    lookup_field = "id"

    def get_queryset(self):
        # Scoped to authenticated user — prevents cross-user access.
        return chat_sessions.objects.filter(user=self.request.user)


# ──────────────────────────────────────────────
#  Chat (message) views
# ──────────────────────────────────────────────

class ChatCreateView(generics.CreateAPIView):
    """
    POST /api/v1/chats/

    Creates a Chat message.

    Behaviour:
      • If `chat_session_id` is provided → find the session, verify ownership,
        then create the Chat under it.
      • If `chat_session_id` is absent   → create a new ChatSession for the
        authenticated user, then create the Chat under it.

    The response always includes the chat_session_id so the frontend can
    reference the session in subsequent requests.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = CreateChatSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_id = serializer.validated_data.get("chat_session_id")

        if session_id:
            # ── Existing session flow ──
            try:
                session = chat_sessions.objects.get(
                    id=session_id,
                    user=request.user,
                )
            except chat_sessions.DoesNotExist:
                return Response(
                    {"detail": "Chat session not found or access denied."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        else:
            # ── New session flow ──
            session = chat_sessions.objects.create(
                user=request.user,
                chat_title="New Chat",
            )

        # Create the chat message under the resolved session.
        chat = chats.objects.create(
            session=session,
            role=serializer.validated_data["role"],
            content=serializer.validated_data["content"],
            message_type=serializer.validated_data.get("message_type", "text"),
            metadata=serializer.validated_data.get("metadata", {}),
        )

        # Touch session's updated_at so it sorts to the top.
        session.save(update_fields=["updated_at"])

        response_data = ChatSerializer(chat).data
        response_data["chat_session_id"] = str(session.id)

        return Response(response_data, status=status.HTTP_201_CREATED)


class ChatAskView(APIView):
    """POST /api/v1/chats/ask/ — queue a persisted chat-to-AI flow."""

    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        serializer = AskChatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_files = request.FILES.getlist("files")
        result = start_ai(
            user=request.user,
            content=serializer.validated_data["content"],
            session_id=serializer.validated_data.get("chat_session_id"),
            uploaded_files=uploaded_files,
            metadata=serializer.validated_data.get("metadata", {}),
        )
        task = result["task"]
        return Response({
            "chat_session_id": str(task.session_id),
            "user_message": ChatSerializer(result["user_message"]).data,
            "task": AITaskSerializer(task).data,
        }, status=status.HTTP_202_ACCEPTED)


class AITaskDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AITaskSerializer
    lookup_field = "id"

    def get_queryset(self):
        return ai_tasks.objects.filter(user=self.request.user)


class AITaskArtifactsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ArtifactSerializer

    def get_queryset(self):
        return artifacts.objects.filter(task__id=self.kwargs["id"], task__user=self.request.user)


class AITaskEventsView(APIView):
    """Authenticated Django SSE proxy for the per-session JSONL event log."""

    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            task = ai_tasks.objects.get(id=id, user=request.user)
        except ai_tasks.DoesNotExist:
            return Response({"detail": "AI task not found."}, status=status.HTTP_404_NOT_FOUND)

        log_path = Path(settings.SESSION_LOG_DIR).resolve() / f"session_{task.session_id}.jsonl"

        def stream():
            position = 0
            deadline = time.monotonic() + settings.AI_TASK_TIMEOUT + 30
            while time.monotonic() < deadline:
                if log_path.exists():
                    with log_path.open("r", encoding="utf-8") as handle:
                        handle.seek(position)
                        new_lines = handle.readlines()
                        position = handle.tell()
                    for line in new_lines:
                        try:
                            event = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
                current_status = ai_tasks.objects.filter(id=task.id).values_list("status", flat=True).first()
                if current_status in {"success", "failed", "cancelled"} and position >= (log_path.stat().st_size if log_path.exists() else 0):
                    break
                time.sleep(0.25)

        response = StreamingHttpResponse(stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response


class ChatListBySessionView(generics.ListAPIView):
    """
    GET /api/v1/chats/sessions/<id>/chats/

    Returns all chats for a session, in chronological order.
    Ownership is enforced: the session must belong to request.user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer

    def get_queryset(self):
        session_id = self.kwargs["session_id"]
        # Filter through the session → user relationship for ownership.
        return chats.objects.filter(
            session__id=session_id,
            session__user=self.request.user,
        )


class ChatDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/v1/chats/<id>/   → retrieve a single chat message
    DELETE /api/v1/chats/<id>/   → delete a single chat message

    Ownership is enforced through session → user.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer
    lookup_field = "id"

    def get_queryset(self):
        # Only return chats whose session belongs to the authenticated user.
        return chats.objects.filter(session__user=self.request.user)
