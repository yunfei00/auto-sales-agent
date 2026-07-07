from django.contrib import admin

from .models import Brand, SalesPolicy, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "country")
    search_fields = ("name", "code")


@admin.register(VehicleSeries)
class VehicleSeriesAdmin(admin.ModelAdmin):
    list_display = ("name", "brand")
    search_fields = ("name", "brand__name")
    list_filter = ("brand",)


@admin.register(VehicleModel)
class VehicleModelAdmin(admin.ModelAdmin):
    list_display = ("name", "series", "model_year", "energy_type", "body_type", "seats", "is_active")
    search_fields = ("name", "series__name", "series__brand__name")
    list_filter = ("energy_type", "body_type", "is_active")


@admin.register(VehicleTrim)
class VehicleTrimAdmin(admin.ModelAdmin):
    list_display = ("name", "model", "official_price", "range_km", "is_active")
    search_fields = ("name", "model__name")
    list_filter = ("is_active",)


@admin.register(VehicleInventory)
class VehicleInventoryAdmin(admin.ModelAdmin):
    list_display = ("vin", "trim", "store", "status", "exterior_color", "listed_price", "arrival_date")
    search_fields = ("vin", "trim__name", "trim__model__name")
    list_filter = ("status", "store", "exterior_color")


@admin.register(SalesPolicy)
class SalesPolicyAdmin(admin.ModelAdmin):
    list_display = ("title", "store", "model", "policy_type", "amount", "is_active", "end_date")
    search_fields = ("title", "description", "model__name")
    list_filter = ("policy_type", "is_active", "store")

# Register your models here.
