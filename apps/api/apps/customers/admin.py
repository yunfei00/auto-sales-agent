from django.contrib import admin

from .models import Customer, CustomerTask, DemandProfile, Interaction


class DemandProfileInline(admin.StackedInline):
    model = DemandProfile
    extra = 0


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "tenant", "store", "stage", "deal_probability", "owner", "updated_at")
    search_fields = ("name", "phone", "wechat", "source_label")
    list_filter = ("stage", "tenant", "store")
    inlines = [DemandProfileInline]


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
