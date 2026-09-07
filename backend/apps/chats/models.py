import uuid
from django.conf import settings
from django.db import models


class chat_sessions(models.Model):
    
    # Represents a conversation session owned by a User.
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_title = models.CharField(max_length=255, default="New Chat")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_sessions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.chat_title} ({self.id})"


class chats(models.Model):
    
    # Represents an individual message/entry within a ChatSession.
    
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
    ]

    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("file", "File"),
        ("action", "Action"),
        ("permission_request", "Permission Request"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        chat_sessions,
        on_delete=models.CASCADE,
        related_name="chats"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()
    message_type = models.CharField(
        max_length=30,
        choices=MESSAGE_TYPE_CHOICES,
        default="text"
    )
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.role}] {self.content[:30]} ({self.id})"


class attachments(models.Model):
    
    # Represents a file attachment associated with a Chat message.
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        chats,
        on_delete=models.CASCADE,
        related_name="attachments"
    )
    file = models.FileField(upload_to="chat_attachments/")
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.BigIntegerField(help_text="File size in bytes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.file_name} ({self.id})"


class ai_tasks(models.Model):
    """Durable record of a Django request sent to the local AI service."""

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("success", "Success"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    execution_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_tasks")
    session = models.ForeignKey(chat_sessions, on_delete=models.CASCADE, related_name="ai_tasks")
    request_message = models.ForeignKey(chats, on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_requests")
    assistant_message = models.ForeignKey(chats, on_delete=models.SET_NULL, null=True, blank=True, related_name="ai_responses")
    request_text = models.TextField()
    response_text = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")
    model_used = models.CharField(max_length=150, blank=True, default="")
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]


class artifacts(models.Model):
    """Generated local output linked to its AI execution."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(ai_tasks, on_delete=models.CASCADE, related_name="artifacts")
    name = models.CharField(max_length=255)
    path = models.TextField()
    artifact_type = models.CharField(max_length=50, blank=True, default="file")
    verification_status = models.CharField(max_length=50, blank=True, default="unknown")
    sha256 = models.CharField(max_length=64, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

