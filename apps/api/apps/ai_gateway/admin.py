from django.contrib import admin

from .models import AIConversation, AIMessage, AIToolCall


@admin.register(AIConversation)
class AIConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "user", "context_type", "context_id", "updated_at")
    search_fields = ("title", "context_type", "context_id")


@admin.register(AIMessage)
class AIMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "created_at")
    search_fields = ("content",)
    list_filter = ("role",)


@admin.register(AIToolCall)
class AIToolCallAdmin(admin.ModelAdmin):
    list_display = ("tool_name", "message", "success", "duration_ms", "created_at")
    search_fields = ("tool_name", "error_message")
    list_filter = ("success",)

# Register your models here.
