from django.urls import path

from apps.chats.views import (
    ChatSessionListCreateView,
    ChatSessionDetailView,
    ChatCreateView,
    ChatListBySessionView,
    ChatDetailView,
    ChatAskView,
    AITaskListView,
    AITaskDetailView,
    AITaskArtifactsView,
    AITaskEventsView,
    AITaskCancelView,
    ArtifactDownloadView,
    AttachmentDownloadView,
    DocumentFeedView,
    DocumentUploadView,
    AuditFeedView,
    AITaskNetworkView,
    AITaskPermissionListView,
    AITaskPermissionDecisionView,
    PermissionQueueView,
)
from apps.chats.platform_views import (
    KnowledgeSearchView, KnowledgeAskView, KnowledgeIngestView, MemoryView,
    MemorySearchView, AuditVerifyView, ModelRegistryView, WorkflowListView,
    WorkflowValidateView, WorkflowExecuteView, WorkflowVisualView, JobsView,
    JobDetailView, EvaluationSummaryView, KubernetesManifestView,
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
    path("tasks/", AITaskListView.as_view(), name="ai_task_list"),
    path("documents/", DocumentFeedView.as_view(), name="document_feed"),
    path("documents/upload/", DocumentUploadView.as_view(), name="document_upload"),
    path("audit/", AuditFeedView.as_view(), name="audit_feed"),
    path("audit/verify/", AuditVerifyView.as_view(), name="audit_verify"),
    path("knowledge/search/", KnowledgeSearchView.as_view(), name="knowledge_search"),
    path("knowledge/ask/", KnowledgeAskView.as_view(), name="knowledge_ask"),
    path("knowledge/ingest/", KnowledgeIngestView.as_view(), name="knowledge_ingest"),
    path("memory/", MemoryView.as_view(), name="memory"),
    path("memory/search/", MemorySearchView.as_view(), name="memory_search"),
    path("models/", ModelRegistryView.as_view(), name="model_registry"),
    path("workflows/", WorkflowListView.as_view(), name="workflow_list"),
    path("workflows/validate/", WorkflowValidateView.as_view(), name="workflow_validate"),
    path("workflows/execute/", WorkflowExecuteView.as_view(), name="workflow_execute"),
    path("workflows/<str:name>/<str:version>/visual/", WorkflowVisualView.as_view(), name="workflow_visual"),
    path("jobs/", JobsView.as_view(), name="jobs"),
    path("jobs/<str:job_id>/", JobDetailView.as_view(), name="job_detail"),
    path("evaluations/summary/", EvaluationSummaryView.as_view(), name="evaluation_summary"),
    path("kubernetes/manifest/", KubernetesManifestView.as_view(), name="kubernetes_manifest"),
    path("tasks/<uuid:id>/", AITaskDetailView.as_view(), name="ai_task_detail"),
    path("tasks/<uuid:id>/cancel/", AITaskCancelView.as_view(), name="ai_task_cancel"),
    path("tasks/<uuid:id>/artifacts/", AITaskArtifactsView.as_view(), name="ai_task_artifacts"),
    path("tasks/<uuid:id>/events/", AITaskEventsView.as_view(), name="ai_task_events"),
    path("tasks/<uuid:id>/network/", AITaskNetworkView.as_view(), name="ai_task_network"),
    path("tasks/<uuid:id>/permissions/", AITaskPermissionListView.as_view(), name="ai_task_permissions"),
    path("tasks/<uuid:id>/permissions/<str:request_id>/<str:decision>/", AITaskPermissionDecisionView.as_view(), name="ai_task_permission_decision"),
    path("permissions/", PermissionQueueView.as_view(), name="permission_queue"),
    path("artifacts/<uuid:id>/download/", ArtifactDownloadView.as_view(), name="artifact_download"),
    path("attachments/<uuid:id>/download/", AttachmentDownloadView.as_view(), name="attachment_download"),

    # Retrieve / delete a single chat message.
    path("<uuid:id>/", ChatDetailView.as_view(), name="chat_detail"),
]
