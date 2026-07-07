from django.contrib import admin

from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "tenant", "store", "role", "phone")
    search_fields = ("user__username", "user__email", "phone")
    list_filter = ("role", "tenant", "store")

# Register your models here.
