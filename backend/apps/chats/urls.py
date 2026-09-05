from django.urls import path

from apps.chats.views import (
    ChatSessionListCreateView,
    ChatSessionDetailView,
    ChatCreateView,
    ChatListBySessionView,
    ChatDetailView,
)

urlpatterns = [
    # ── ChatSession endpoints ──
    # List user's sessions / create a new empty session.
    path("sessions/", ChatSessionListCreateView.as_view(), name="session_list_create"),

    # Retrieve / update (rename) / delete a specific session.
    path("sessions/<uuid:id>/", ChatSessionDetailView.as_view(), name="session_detail"),

    # List all chats inside a specific session.
    path("sessions/<uuid:session_id>/chats/", ChatListBySessionView.as_view(), name="session_chats"),

    # ── Chat (message) endpoints ──
    # Create a chat (with or without existing session).
    path("", ChatCreateView.as_view(), name="chat_create"),

    # Retrieve / delete a single chat message.
    path("<uuid:id>/", ChatDetailView.as_view(), name="chat_detail"),
]
