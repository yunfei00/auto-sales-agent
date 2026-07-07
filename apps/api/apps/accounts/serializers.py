from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")

    class Meta:
        model = UserProfile
        fields = ("role", "phone", "tenant", "tenant_name", "store", "store_name")


class CurrentUserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = get_user_model()
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "is_staff",
            "is_superuser",
            "profile",
        )

    def get_display_name(self, user):
        return user.get_full_name() or user.username


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    captcha = serializers.CharField(max_length=8, trim_whitespace=True, write_only=True)
