from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.users.models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Admin configuration for the custom User model.
    Administrators can create and manage employees from here.
    No public registration endpoint is exposed.
    """

    # Columns shown in the employee list view
    list_display = [
        "username",
        "email",
        "display_name",
        "unique_id",
        "is_staff",
        "is_active",
        "created_at",
    ]
    list_filter = ["is_staff", "is_active", "is_superuser"]
    search_fields = ["username", "email", "display_name"]
    ordering = ["-created_at"]
    readonly_fields = ["unique_id", "created_at", "updated_at"]

    # Extend the default UserAdmin fieldsets to include our custom fields
    fieldsets = UserAdmin.fieldsets + (
        (
            "AEGIS Profile",
            {
                "fields": ("unique_id", "display_name", "created_at", "updated_at"),
            },
        ),
    )

    # Fieldsets when creating a new employee
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "AEGIS Profile",
            {
                "fields": ("email", "display_name"),
            },
        ),
    )
