import json

from rest_framework import serializers

from apps.chats.models import ai_tasks, artifacts, chat_sessions, chats, permission_requests


class ChatSerializer(serializers.ModelSerializer):
    """
    Serializer for individual Chat messages.
    Read-only fields are set by the server; the client only sends
    session, role, content, message_type, and metadata.
    """

    class Meta:
        model = chats
        fields = [
            "id",
            "session",
            "role",
            "content",
            "message_type",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ChatSessionListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing ChatSessions.
    Does NOT embed full chat history — keeps list responses fast.
    """

    class Meta:
        model = chat_sessions
        fields = [
            "id",
            "chat_title",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ChatSessionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for a single ChatSession.
    Includes nested chats in chronological order.
    """

    chats = ChatSerializer(many=True, read_only=True)

    class Meta:
        model = chat_sessions
        fields = [
            "id",
            "chat_title",
            "created_at",
            "updated_at",
            "chats",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CreateChatSerializer(serializers.Serializer):
    """
    Input serializer for creating a Chat.
    Accepts an optional chat_session_id:
      - If provided → append to existing session (ownership verified in view).
      - If omitted  → a new ChatSession is created automatically.
    """

    chat_session_id = serializers.UUIDField(required=False, allow_null=True)
    role = serializers.ChoiceField(choices=chats.ROLE_CHOICES)
    content = serializers.CharField()
    message_type = serializers.ChoiceField(
        choices=chats.MESSAGE_TYPE_CHOICES,
        default="text",
    )
    metadata = serializers.JSONField(default=dict, required=False)


class AskChatSerializer(serializers.Serializer):
    chat_session_id = serializers.UUIDField(required=False, allow_null=True)
    content = serializers.CharField(min_length=1)
    metadata = serializers.JSONField(default=dict, required=False)

    def validate_metadata(self, value):
        # Multipart forms deliver JSON fields as strings. Accept both the
        # normal JSON object and the string form used by browser FormData.
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError("metadata must contain valid JSON") from exc
            if not isinstance(parsed, dict):
                raise serializers.ValidationError("metadata must be an object")
            return parsed
        return value


class AITaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = ai_tasks
        fields = ["id", "execution_id", "session", "request_message", "assistant_message", "request_text", "response_text", "status", "model_used", "result", "network", "error", "created_at", "updated_at"]


class ArtifactSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    def get_download_url(self, obj):
        request = self.context.get("request")
        if request is None:
            return None
        from django.urls import reverse
        return request.build_absolute_uri(reverse("artifact_download", kwargs={"id": obj.id}))

    class Meta:
        model = artifacts
        fields = ["id", "task", "name", "path", "artifact_type", "verification_status", "sha256", "metadata", "download_url", "created_at"]


class PermissionRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = permission_requests
        fields = [
            "id", "request_id", "task", "action", "tool", "details", "status",
            "decided_by", "decision_reason", "created_at", "updated_at", "expires_at",
        ]
        read_only_fields = fields
