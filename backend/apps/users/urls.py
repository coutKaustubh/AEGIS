from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.users.views import MeView, EmployeeCreateView

urlpatterns = [
    # Login — accepts username + password, returns access + refresh tokens.
    path("login/", TokenObtainPairView.as_view(), name="auth_login"),

    # Refresh — accepts a refresh token, returns a new access token.
    path("refresh/", TokenRefreshView.as_view(), name="auth_refresh"),
 
    # Me — returns the currently authenticated employee's profile.
    path("me/", MeView.as_view(), name="auth_me"),
    path("employees/", EmployeeCreateView.as_view(), name="employee_create"),
]
