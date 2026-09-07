from django.urls import path

from apps.chats.views import (
    ChatSessionListCreateView,
    ChatSessionDetailView,
    ChatCreateView,
    ChatListBySessionView,
    ChatDetailView,
    ChatAskView,
    AITaskDetailView,
    AITaskArtifactsView,
    AITaskEventsView,
    ArtifactDownloadView,
    AITaskNetworkView,
    AITaskPermissionListView,
    AITaskPermissionDecisionView,
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
    path("ask/", ChatAskView.as_view(), name="chat_ask"),
    path("tasks/<uuid:id>/", AITaskDetailView.as_view(), name="ai_task_detail"),
    path("tasks/<uuid:id>/artifacts/", AITaskArtifactsView.as_view(), name="ai_task_artifacts"),
    path("tasks/<uuid:id>/events/", AITaskEventsView.as_view(), name="ai_task_events"),
    path("tasks/<uuid:id>/network/", AITaskNetworkView.as_view(), name="ai_task_network"),
    path("tasks/<uuid:id>/permissions/", AITaskPermissionListView.as_view(), name="ai_task_permissions"),
    path("tasks/<uuid:id>/permissions/<str:request_id>/<str:decision>/", AITaskPermissionDecisionView.as_view(), name="ai_task_permission_decision"),
    path("artifacts/<uuid:id>/download/", ArtifactDownloadView.as_view(), name="artifact_download"),

    # Retrieve / delete a single chat message.
    path("<uuid:id>/", ChatDetailView.as_view(), name="chat_detail"),
]
