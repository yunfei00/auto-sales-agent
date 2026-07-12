from rest_framework import serializers

from common.security import user_can_access_customer, user_profile_scope

from .models import Order, Quote, TestDrive


class SalesRelationScopeMixin:
    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if request and customer and not user_can_access_customer(request.user, customer):
            raise serializers.ValidationError({"customer": "Customer is outside your tenant/store scope."})
        if self.instance and "customer" in attrs and attrs["customer"].id != self.instance.customer_id:
            raise serializers.ValidationError({"customer": "Customer cannot be changed after creation."})

        inventory = attrs.get("inventory", getattr(self.instance, "inventory", None))
        if customer and inventory and inventory.store.tenant_id != customer.tenant_id:
            raise serializers.ValidationError({"inventory": "Inventory and customer must belong to the same tenant."})
        if request and inventory:
            _tenant, scoped_store, unrestricted = user_profile_scope(request.user)
            if not unrestricted and scoped_store and inventory.store_id != scoped_store.id:
                raise serializers.ValidationError({"inventory": "Inventory is outside your store scope."})

        quote = attrs.get("quote", getattr(self.instance, "quote", None))
        if quote and customer and quote.customer_id != customer.id:
            raise serializers.ValidationError({"quote": "Quote and order must belong to the same customer."})
        return attrs


class TestDriveSerializer(SalesRelationScopeMixin, serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = TestDrive
        fields = "__all__"
        read_only_fields = ("consultant", "completed_at")

    def get_inventory_title(self, test_drive):
        return str(test_drive.inventory.trim) if test_drive.inventory else ""

    def get_consultant_name(self, test_drive):
        return test_drive.consultant.get_full_name() or test_drive.consultant.username if test_drive.consultant else ""


class QuoteSerializer(SalesRelationScopeMixin, serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = Quote
        fields = "__all__"
        read_only_fields = ("consultant", "sent_at")

    def get_inventory_title(self, quote):
        return str(quote.inventory.trim) if quote.inventory else ""

    def get_consultant_name(self, quote):
        return quote.consultant.get_full_name() or quote.consultant.username if quote.consultant else ""


class OrderSerializer(SalesRelationScopeMixin, serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    inventory_title = serializers.SerializerMethodField()
    consultant_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"
        read_only_fields = ("consultant",)

    def get_inventory_title(self, order):
        return str(order.inventory.trim) if order.inventory else ""

    def get_consultant_name(self, order):
        return order.consultant.get_full_name() or order.consultant.username if order.consultant else ""
