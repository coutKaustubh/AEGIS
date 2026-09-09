"""Authenticated Django bridge for the non-chat AEGIS runtime APIs."""
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_client import AIClient, AIServiceError


class RuntimeProxyView(APIView):
    permission_classes = [IsAuthenticated]
    runtime_path = "/api/health"
    runtime_method = "GET"

    def dispatch_runtime(self, request, **kwargs):
        client = AIClient()
        path = self.runtime_path.format(**kwargs)
        payload = request.data if request.method in {"POST", "PUT", "PATCH"} else None
        try:
            result = client.platform(self.runtime_method, path, payload)
        except AIServiceError as exc:
            return Response({"detail": str(exc)}, status=503)
        return Response(result)

    def get(self, request, **kwargs):
        return self.dispatch_runtime(request, **kwargs)

    def post(self, request, **kwargs):
        return self.dispatch_runtime(request, **kwargs)

    def delete(self, request, **kwargs):
        return self.dispatch_runtime(request, **kwargs)


class KnowledgeSearchView(RuntimeProxyView):
    runtime_path = "/api/knowledge/search"
    runtime_method = "POST"


class KnowledgeAskView(RuntimeProxyView):
    runtime_path = "/api/knowledge/ask"
    runtime_method = "POST"


class KnowledgeIngestView(RuntimeProxyView):
    runtime_path = "/api/knowledge/ingest"
    runtime_method = "POST"


class MemoryView(RuntimeProxyView):
    runtime_path = "/api/memory"
    runtime_method = "POST"


class MemorySearchView(RuntimeProxyView):
    runtime_path = "/api/memory/search"
    runtime_method = "GET"

    def dispatch_runtime(self, request, **kwargs):
        query = request.query_params.urlencode()
        self.runtime_path = "/api/memory/search" + (f"?{query}" if query else "")
        return super().dispatch_runtime(request, **kwargs)


class AuditVerifyView(RuntimeProxyView):
    runtime_path = "/api/audit/verify"
    runtime_method = "GET"


class ModelRegistryView(RuntimeProxyView):
    runtime_path = "/api/models"
    runtime_method = "GET"


class WorkflowListView(RuntimeProxyView):
    runtime_path = "/api/workflows"
    runtime_method = "GET"

    def post(self, request, **kwargs):
        self.runtime_method = "POST"
        return self.dispatch_runtime(request, **kwargs)


class WorkflowValidateView(RuntimeProxyView):
    runtime_path = "/api/workflows/validate"
    runtime_method = "POST"


class WorkflowExecuteView(RuntimeProxyView):
    runtime_path = "/api/workflows/execute"
    runtime_method = "POST"


class WorkflowVisualView(RuntimeProxyView):
    runtime_path = "/api/workflows/{name}/{version}/visual"
    runtime_method = "GET"


class JobsView(RuntimeProxyView):
    runtime_path = "/api/jobs"
    runtime_method = "POST"


class JobDetailView(RuntimeProxyView):
    runtime_path = "/api/jobs/{job_id}"
    runtime_method = "GET"

    def delete(self, request, **kwargs):
        self.runtime_method = "DELETE"
        return self.dispatch_runtime(request, **kwargs)


class EvaluationSummaryView(RuntimeProxyView):
    runtime_path = "/api/evaluations/summary"
    runtime_method = "GET"


class KubernetesManifestView(RuntimeProxyView):
    runtime_path = "/api/kubernetes/manifest"
    runtime_method = "GET"

    def dispatch_runtime(self, request, **kwargs):
        query = request.query_params.urlencode()
        self.runtime_path = "/api/kubernetes/manifest" + (f"?{query}" if query else "")
        return super().dispatch_runtime(request, **kwargs)
