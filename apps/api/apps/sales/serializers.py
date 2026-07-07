from rest_framework import serializers

from .models import Order, Quote, TestDrive


class TestDriveSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = TestDrive
        fields = "__all__"

    def get_inventory_title(self, test_drive):
        return str(test_drive.inventory.trim) if test_drive.inventory else ""

    def get_consultant_name(self, test_drive):
        return test_drive.consultant.get_full_name() or test_drive.consultant.username if test_drive.consultant else ""


class QuoteSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = "__all__"

    def get_inventory_title(self, quote):
        return str(quote.inventory.trim) if quote.inventory else ""

    def get_consultant_name(self, quote):
        return quote.consultant.get_full_name() or quote.consultant.username if quote.consultant else ""


class OrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"

    def get_inventory_title(self, order):
        return str(order.inventory.trim) if order.inventory else ""

    def get_consultant_name(self, order):
        return order.consultant.get_full_name() or order.consultant.username if order.consultant else ""
