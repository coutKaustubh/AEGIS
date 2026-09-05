from rest_framework import serializers
from apps.users.models import User


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer for the /me/ endpoint.
    Exposes only safe, non-sensitive fields.
    """

    class Meta:
        model = User
        fields = [
            "unique_id",
            "username",
            "email",
            "display_name",
        ]
        # All fields are read-only — this serializer is only used for output.
        read_only_fields = fields
