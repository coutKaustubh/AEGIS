from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.users.models import User


class EmailOrUsernameTokenSerializer(TokenObtainPairSerializer):
    """Allow the UI's official identifier to be either username or email."""

    def validate(self, attrs):
        identifier = attrs.get(self.username_field, "")
        if identifier and not User.objects.filter(username=identifier).exists():
            match = User.objects.filter(email__iexact=identifier).first()
            if match:
                attrs[self.username_field] = match.get_username()
        return super().validate(attrs)


class UserMeSerializer(serializers.ModelSerializer):
    """
    Serializer for the /me/ endpoint.
    Exposes only safe, non-sensitive fields.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "unique_id",
            "username",
            "email",
            "display_name",
            "role",
            "status",
        ]
        # All fields are read-only — this serializer is only used for output.
        read_only_fields = fields

    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    def get_role(self, obj):
        return "admin" if obj.is_staff or obj.is_superuser else "employee"

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"


class EmployeeCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "unique_id", "username", "email", "display_name", "password", "role", "status"]
        read_only_fields = ["id", "unique_id", "role", "status"]

    def get_role(self, obj):
        return "admin" if obj.is_staff or obj.is_superuser else "employee"

    def get_status(self, obj):
        return "active" if obj.is_active else "inactive"

    def create(self, validated_data):
        password = validated_data.pop("password")
        employee = User(**validated_data, is_staff=False, is_superuser=False, is_active=True)
        employee.set_password(password)
        employee.save()
        return employee


class EmployeeDirectorySerializer(UserMeSerializer):
    """Safe admin directory representation used by the frontend."""

    is_active = serializers.BooleanField(required=False, write_only=True)

    class Meta(UserMeSerializer.Meta):
        fields = UserMeSerializer.Meta.fields + ["is_active"]
        read_only_fields = UserMeSerializer.Meta.fields
