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


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "display_name", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        employee = User(**validated_data, is_staff=False, is_superuser=False, is_active=True)
        employee.set_password(password)
        employee.save()
        return employee
