"""Small dependency-free CORS middleware for the local Vite development UI."""

from django.conf import settings
from django.http import HttpResponse
from urllib.parse import urlparse


def _is_allowed_origin(origin, configured):
    """Allow configured origins and local Vite development ports only."""
    if origin in configured:
        return True
    # Vite may move to 5174/5175 when another dev server is already running.
    # Keep this limited to loopback hosts; production origins still must be
    # explicitly configured through CORS_ALLOWED_ORIGINS.
    try:
        parsed = urlparse(origin)
    except ValueError:
        return False
    return (
        parsed.scheme in {"http", "https"}
        and parsed.hostname in {"localhost", "127.0.0.1"}
        and parsed.port is not None
        and 5173 <= parsed.port <= 5199
    )


class LocalCorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        allowed = getattr(settings, "CORS_ALLOWED_ORIGINS", {"http://localhost:5173", "http://127.0.0.1:5173"})
        # Django exposes browser headers through META in every WSGI server.
        # Using META also keeps this middleware compatible with the Windows
        # development server and WSL/browser requests.
        origin = request.META.get("HTTP_ORIGIN")
        if request.method == "OPTIONS":
            response = HttpResponse(status=204)
        else:
            response = self.get_response(request)
        if origin and _is_allowed_origin(origin, allowed):
            response["Access-Control-Allow-Origin"] = origin
            response["Vary"] = "Origin"
            response["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, X-Requested-With"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Max-Age"] = "600"
        return response
