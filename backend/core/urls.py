"""
URL configuration for core project.

URL structure:
    /admin/              — Django Admin (employee management)
    /api/v1/auth/        — Authentication (login, refresh, me)
    /api/v1/chats/       — Chat sessions and messages
"""

from django.contrib import admin
from django.urls import path, include
from core.views import SystemHealthView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/chats/", include("apps.chats.urls")),
    path("api/v1/engineering/", include("apps.engineering.urls")),
    path("api/v1/system/health/", SystemHealthView.as_view(), name="system_health"),
]
