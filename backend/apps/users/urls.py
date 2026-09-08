from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from apps.users.views import MeView, EmployeeCreateView, EmployeeListView, EmployeeDetailView, LoginView

urlpatterns = [
    # Login — accepts username + password, returns access + refresh tokens.
    path("login/", LoginView.as_view(), name="auth_login"),

    # Refresh — accepts a refresh token, returns a new access token.
    path("refresh/", TokenRefreshView.as_view(), name="auth_refresh"),
 
    # Me — returns the currently authenticated employee's profile.
    path("me/", MeView.as_view(), name="auth_me"),
    path("employees/", EmployeeCreateView.as_view(), name="employee_create"),
    path("employees/directory/", EmployeeListView.as_view(), name="employee_directory"),
    path("employees/<int:pk>/", EmployeeDetailView.as_view(), name="employee_detail"),
]
