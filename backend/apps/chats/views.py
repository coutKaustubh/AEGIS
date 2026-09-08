from rest_framework import generics, status
import json
import time
from pathlib import Path

from django.conf import settings
from django.db.models import Q
from django.http import StreamingHttpResponse
from django.http import FileResponse
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.renderers import BaseRenderer
from rest_framework.permissions import IsAuthenticated

from apps.chats.models import ai_tasks, artifacts, attachments, chat_sessions, chats, permission_requests
from apps.chats.serializers import (
    ChatSerializer,
    ChatSessionListSerializer,
    ChatSessionDetailSerializer,
    CreateChatSerializer,
    AITaskSerializer,
    ArtifactSerializer,
    AskChatSerializer,
    PermissionRequestSerializer,
)
from apps.chats.ai_client import AIClient, AIServiceError
from apps.chats.services import ask_ai, start_ai, _save_uploaded_files


class EventStreamRenderer(BaseRenderer):
    """Tell DRF that the authenticated task-events endpoint speaks SSE."""

    media_type = "text/event-stream"
    format = "sse"
    charset = None
    render_style = "binary"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        # AITaskEventsView returns a StreamingHttpResponse, so DRF never
        # serializes the event body. The renderer is needed only for content
        # negotiation before the view is called.
        return data


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


class AITaskListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AITaskSerializer

    def get_queryset(self):
        queryset = ai_tasks.objects.filter(user=self.request.user).select_related("session")
        requested = self.request.query_params.get("status")
        if requested in {"queued", "running", "success", "failed", "cancelled"}:
            queryset = queryset.filter(status=requested)
        return queryset


class DocumentFeedView(APIView):
    """Return uploaded inputs and generated artifacts in one UI-friendly feed."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = []
        for item in attachments.objects.filter(message__session__user=request.user).select_related("message"):
            rows.append({
                "id": str(item.id), "name": item.file_name,
                "type": item.file_type or "file", "path": str(item.file),
                "size": item.file_size, "status": "uploaded",
                "created_at": item.created_at.isoformat(),
                "download_url": request.build_absolute_uri(f"/api/v1/chats/attachments/{item.id}/download/"),
            })
        for item in artifacts.objects.filter(task__user=request.user):
            artifact_path = Path(str(item.path)).resolve()
            rows.append({
                "id": str(item.id), "name": item.name,
                "type": item.artifact_type or "file", "path": item.path,
                "size": artifact_path.stat().st_size if artifact_path.is_file() else 0,
                "status": item.verification_status or "generated",
                "created_at": item.created_at.isoformat(),
                "hash": item.sha256,
                "download_url": request.build_absolute_uri(f"/api/v1/chats/artifacts/{item.id}/download/"),
            })
        rows.sort(key=lambda value: value["created_at"], reverse=True)
        return Response(rows)


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def post(self, request):
        uploaded = request.FILES.getlist("files")
        if not uploaded:
            return Response({"detail": "Attach at least one file."}, status=status.HTTP_400_BAD_REQUEST)
        session = chat_sessions.objects.create(user=request.user, chat_title="Document Ingestion")
        message = chats.objects.create(session=session, role="system", content="Document ingestion", message_type="file")
        saved = _save_uploaded_files(message, uploaded)
        return Response({"files": saved, "session_id": str(session.id)}, status=status.HTTP_201_CREATED)


class AttachmentDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            attachment = attachments.objects.get(id=id, message__session__user=request.user)
        except attachments.DoesNotExist:
            return Response({"detail": "Attachment not found."}, status=status.HTTP_404_NOT_FOUND)
        path = Path(str(attachment.file)).resolve()
        root = Path(settings.AI_SHARED_UPLOAD_DIR).resolve()
        if not path.is_file() or not (path == root or root in path.parents):
            return Response({"detail": "Attachment file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(path.open("rb"), as_attachment=True, filename=attachment.file_name)


class AuditFeedView(APIView):
    """Build an authenticated provenance feed from durable chat/task records."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        rows = []
        for task in ai_tasks.objects.filter(user=request.user):
            rows.append({
                "id": f"task-{task.id}", "artifactId": str(task.id),
                "artifactName": task.request_text[:120], "action": "AGENT_EXECUTED",
                "actor": "AEGIS AI", "model": task.model_used,
                "timestamp": task.updated_at.isoformat(), "hash": "",
                "blockchainStatus": "not_recorded",
            })
        for item in artifacts.objects.filter(task__user=request.user):
            rows.append({
                "id": f"artifact-{item.id}", "artifactId": str(item.id),
                "artifactName": item.name, "action": "DOCUMENT_GENERATED",
                "actor": "AEGIS AI", "model": item.metadata.get("model", "") if isinstance(item.metadata, dict) else "",
                "timestamp": item.created_at.isoformat(), "hash": item.sha256,
                "blockchainStatus": "not_recorded",
            })
        for item in attachments.objects.filter(message__session__user=request.user):
            rows.append({
                "id": f"upload-{item.id}", "artifactId": str(item.id),
                "artifactName": item.file_name, "action": "DOCUMENT_UPLOADED",
                "actor": str(request.user), "timestamp": item.created_at.isoformat(),
                "hash": "", "blockchainStatus": "not_recorded",
            })
        rows.sort(key=lambda value: value["timestamp"], reverse=True)
        return Response(rows)


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


def _resolve_artifact_path(record: artifacts) -> Path:
    raw = Path(record.path)
    candidate = raw if raw.is_absolute() else Path(settings.AI_ARTIFACT_ROOT) / raw
    candidate = candidate.resolve()
    allowed_roots = [
        Path(settings.AI_ARTIFACT_ROOT).resolve(),
        Path(settings.AI_SHARED_UPLOAD_DIR).resolve(),
        Path(settings.MEDIA_ROOT).resolve(),
    ]
    if not any(candidate == root or root in candidate.parents for root in allowed_roots):
        raise ValueError("artifact_path_outside_allowed_storage")
    return candidate


class ArtifactDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            artifact = artifacts.objects.get(id=id, task__user=request.user)
        except artifacts.DoesNotExist:
            return Response({"detail": "Artifact not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            path = _resolve_artifact_path(artifact)
        except ValueError:
            return Response({"detail": "Artifact storage path is not allowed."}, status=status.HTTP_403_FORBIDDEN)
        if not path.is_file():
            return Response({"detail": "Artifact file is unavailable."}, status=status.HTTP_404_NOT_FOUND)
        return FileResponse(path.open("rb"), as_attachment=True, filename=artifact.name)


class AITaskNetworkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, id):
        try:
            task = ai_tasks.objects.get(id=id, user=request.user)
        except ai_tasks.DoesNotExist:
            return Response({"detail": "AI task not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(task.network or (task.result or {}).get("network_report") or {})


class AITaskPermissionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PermissionRequestSerializer

    def get_queryset(self):
        visibility = Q() if self.request.user.is_staff else Q(task__user=self.request.user)
        return permission_requests.objects.filter(task__id=self.kwargs["id"]).filter(visibility)


class PermissionQueueView(generics.ListAPIView):
    """Approval inbox for the authenticated owner or an administrator."""

    permission_classes = [IsAuthenticated]
    serializer_class = PermissionRequestSerializer

    def get_queryset(self):
        visibility = Q() if self.request.user.is_staff else Q(task__user=self.request.user)
        queryset = permission_requests.objects.filter(visibility)
        requested = self.request.query_params.get("status")
        if requested in {"pending", "approved", "denied", "expired"}:
            queryset = queryset.filter(status=requested)
        return queryset.select_related("task", "user", "decided_by")


class AITaskPermissionDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id, request_id, decision):
        try:
            query = Q() if request.user.is_staff else Q(task__user=request.user)
            permission = permission_requests.objects.select_related("task").get(
                Q(request_id=request_id, task__id=id) & query
            )
        except permission_requests.DoesNotExist:
            return Response({"detail": "Permission request not found."}, status=status.HTTP_404_NOT_FOUND)
        if permission.status != "pending":
            return Response({"detail": f"Permission is already {permission.status}."}, status=status.HTTP_409_CONFLICT)
        if decision not in {"approve", "deny"}:
            return Response({"detail": "Decision must be approve or deny."}, status=status.HTTP_400_BAD_REQUEST)
        reason = str(request.data.get("reason") or "")[:500]
        client = AIClient()
        try:
            result = (
                client.approve_permission(permission.task.execution_id, request_id, reason)
                if decision == "approve"
                else client.deny_permission(permission.task.execution_id, request_id, reason)
            )
        except AIServiceError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_502_BAD_GATEWAY)
        permission.status = "approved" if decision == "approve" else "denied"
        permission.decided_by = request.user
        permission.decision_reason = reason
        permission.details = {**(permission.details or {}), "decision_response": result}
        permission.save(update_fields=["status", "decided_by", "decision_reason", "details", "updated_at"])
        return Response(PermissionRequestSerializer(permission, context={"request": request}).data)


class AITaskEventsView(APIView):
    """Authenticated Django SSE proxy for the per-session JSONL event log."""

    permission_classes = [IsAuthenticated]
    renderer_classes = [EventStreamRenderer]

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
                        # A session log contains events for every task in the
                        # conversation.  The browser is listening for one
                        # task only, so never leak an older task's assistant
                        # message or failure into the current SSE stream.
                        event_task_id = event.get("task_id")
                        if event_task_id is not None and str(event_task_id) != str(task.id):
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
