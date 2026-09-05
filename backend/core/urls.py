"""
URL configuration for core project.

URL structure:
    /admin/              — Django Admin (employee management)
    /api/v1/auth/        — Authentication (login, refresh, me)
    /api/v1/chats/       — Chat sessions and messages
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/chats/", include("apps.chats.urls")),
]
