from django.db import connection
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chats.ai_client import AIClient, AIServiceError


class SystemHealthView(APIView):
    """Authenticated readiness summary used by the system page."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        database = "ok"
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except Exception as exc:
            database = f"unavailable: {type(exc).__name__}"

        try:
            ai = AIClient().health()
            ai_status = "ok" if ai.get("status") == "ok" else "degraded"
            ai_detail = ai
        except AIServiceError as exc:
            ai_status = "unavailable"
            ai_detail = {"error": str(exc)}

        return Response({
            "django": "ok",
            "database": database,
            "ai_service": ai_status,
            "ai_detail": ai_detail,
            "network_policy": "local_only",
        })
