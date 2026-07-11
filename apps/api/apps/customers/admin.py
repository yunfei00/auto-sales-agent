from django.contrib import admin

from .models import (
    Customer,
    CustomerLevelHistory,
    CustomerTask,
    DemandProfile,
    Interaction,
)


class DemandProfileInline(admin.StackedInline):
    model = DemandProfile
    extra = 0


class CustomerLevelHistoryInline(admin.TabularInline):
    model = CustomerLevelHistory
    extra = 0
    can_delete = False
    fields = (
        "created_at",
        "old_level",
        "new_level",
        "old_score",
        "new_score",
        "trigger",
        "reason",
        "scoring_version",
        "actor",
    )
    readonly_fields = fields
    ordering = ("-created_at",)
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "phone",
        "tenant",
        "store",
        "stage",
        "customer_level",
        "customer_score",
        "level_status",
        "deal_probability",
        "owner",
        "level_updated_at",
    )
    search_fields = ("name", "phone", "wechat", "source_label")
    list_filter = (
        "stage",
        "customer_level",
        "level_status",
        "scoring_version",
        "tenant",
        "store",
    )
    readonly_fields = (
        "customer_level",
        "customer_score",
        "level_status",
        "score_breakdown",
        "level_reason",
        "level_updated_at",
        "scoring_version",
    )
    inlines = [DemandProfileInline, CustomerLevelHistoryInline]


@admin.register(CustomerLevelHistory)
class CustomerLevelHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "customer",
        "old_level",
        "new_level",
        "old_score",
        "new_score",
        "trigger",
        "scoring_version",
        "actor",
        "created_at",
    )
    list_filter = ("old_level", "new_level", "trigger", "scoring_version")
    search_fields = ("customer__name", "customer__phone", "trigger", "reason")
    readonly_fields = (
        "customer",
        "old_level",
        "new_level",
        "old_score",
        "new_score",
        "trigger",
        "score_breakdown",
        "reason",
        "scoring_version",
        "actor",
        "created_at",
    )
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Interaction)
class InteractionAdmin(admin.ModelAdmin):
    list_display = ("customer", "channel", "occurred_at", "created_by")
    search_fields = ("customer__name", "summary", "ai_summary")
    list_filter = ("channel",)


@admin.register(CustomerTask)
class CustomerTaskAdmin(admin.ModelAdmin):
    list_display = ("title", "customer", "owner", "task_type", "due_at", "priority", "status")
    search_fields = ("title", "customer__name", "notes")
    list_filter = ("status", "task_type", "priority")

# Register your models here.
