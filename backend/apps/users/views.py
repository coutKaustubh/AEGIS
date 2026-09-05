from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.users.serializers import UserMeSerializer


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
