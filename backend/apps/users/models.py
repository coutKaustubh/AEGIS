import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    #  Custom User model for AEGIS platform.
    #  Inherits secure password handling and authentication fields from AbstractUser.
    #  Includes unique_id UUID field and metadata.
    
    unique_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    display_name = models.CharField(max_length=150, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.unique_id})"
