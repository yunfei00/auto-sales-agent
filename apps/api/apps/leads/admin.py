from django.contrib import admin

from .models import Lead, LeadImportJob, LeadSource


@admin.register(LeadSource)
class LeadSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active")
    search_fields = ("name", "code")
    list_filter = ("is_active",)


@admin.register(LeadImportJob)
class LeadImportJobAdmin(admin.ModelAdmin):
    list_display = ("id", "tenant", "source", "status", "total_rows", "imported_rows", "created_at")
    search_fields = ("original_filename",)
    list_filter = ("status", "tenant", "source")


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ("name", "phone", "tenant", "store", "intent_model", "score", "status", "assigned_to")
    search_fields = ("name", "phone", "intent_model", "notes")
    list_filter = ("status", "tenant", "store", "source")

# Register your models here.
