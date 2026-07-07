from django.contrib import admin

from .models import Order, Quote, TestDrive


@admin.register(TestDrive)
class TestDriveAdmin(admin.ModelAdmin):
    list_display = ("customer", "inventory", "consultant", "scheduled_at", "status")
    search_fields = ("customer__name", "inventory__vin", "feedback")
    list_filter = ("status",)


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ("id", "customer", "inventory", "consultant", "status", "landing_price", "created_at")
    search_fields = ("customer__name", "inventory__vin", "notes")
    list_filter = ("status",)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "customer", "inventory", "consultant", "status", "total_amount", "expected_delivery_date")
    search_fields = ("order_number", "customer__name", "inventory__vin")
    list_filter = ("status",)

# Register your models here.
