from django.contrib import admin

from .models import Store, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "created_at")
    search_fields = ("name", "code")
    list_filter = ("is_active",)


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "tenant", "city", "phone", "is_active")
    search_fields = ("name", "code", "city")
    list_filter = ("tenant", "city", "is_active")

# Register your models here.
