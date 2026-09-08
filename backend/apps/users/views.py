from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import generics
from rest_framework_simplejwt.views import TokenObtainPairView
from apps.users.models import User

from apps.users.serializers import UserMeSerializer, EmployeeCreateSerializer, EmployeeDirectorySerializer, EmailOrUsernameTokenSerializer


class LoginView(TokenObtainPairView):
    serializer_class = EmailOrUsernameTokenSerializer


class MeView(APIView):
    """
    GET /api/v1/auth/me/

    Returns the currently authenticated employee's profile.
    The user is determined from the JWT — never from a request body or URL parameter.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)


class EmployeeCreateView(generics.CreateAPIView):
    """Admin-only employee creation; there is intentionally no public signup."""

    permission_classes = [IsAdminUser]
    serializer_class = EmployeeCreateSerializer


class EmployeeListView(generics.ListAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = EmployeeDirectorySerializer

    def get_queryset(self):
        return User.objects.filter(is_superuser=False).order_by("username")


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminUser]
    serializer_class = EmployeeDirectorySerializer
    queryset = User.objects.filter(is_superuser=False)

    def partial_update(self, request, *args, **kwargs):
        # The UI only needs activation state. Do not allow role escalation.
        if "is_staff" in request.data or "is_superuser" in request.data:
            return Response({"detail": "Role changes are not allowed here."}, status=400)
        return super().partial_update(request, *args, **kwargs)
