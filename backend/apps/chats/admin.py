from django.contrib import admin
from apps.chats.models import *

# Register your models here.
@admin.register(chat_sessions)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ["chat_title", "user", "created_at", "updated_at"]
    list_filter = ["user", "created_at"]
    search_fields = ["chat_title", "user__username", "user__email"]
    ordering = ["-updated_at"]

@admin.register(chats)
class ChatsAdmin(admin.ModelAdmin):
    list_display = ["session", "role", "message_type", "created_at"]
    list_filter = ["session", "role", "message_type", "created_at"]
    search_fields = ["session__chat_title", "content"]
    ordering = ["created_at"]

@admin.register(attachments)
class AttachmentsAdmin(admin.ModelAdmin):
    list_display = ["file_name", "message", "file_type", "file_size", "created_at"]
    list_filter = ["message", "file_type", "created_at"]
    search_fields = ["message__content", "file_name", "file_type"]
    ordering = ["created_at"]

@admin.register(ai_tasks)
class AITaskAdmin(admin.ModelAdmin):
    list_display = ["execution_id", "user", "status", "model_used", "created_at"]
    list_filter = ["status", "model_used", "created_at"]
    search_fields = ["execution_id", "request_text", "response_text", "user__username"]
    ordering = ["-created_at"]

@admin.register(artifacts)
class ArtifactAdmin(admin.ModelAdmin):
    list_display = ["name", "task", "artifact_type", "verification_status", "created_at"]
    list_filter = ["artifact_type", "verification_status", "created_at"]
    search_fields = ["name", "path"]
    ordering = ["-created_at"]

@admin.register(permission_requests)
class PermissionRequestAdmin(admin.ModelAdmin):
    list_display = ["request_id", "task", "user", "action", "status", "decided_by", "created_at"]
    list_filter = ["status", "action", "created_at"]
    search_fields = ["request_id", "action", "tool", "user__username", "task__execution_id"]
    readonly_fields = ["request_id", "task", "user", "action", "tool", "details", "created_at", "updated_at"]
    ordering = ["-created_at"]
