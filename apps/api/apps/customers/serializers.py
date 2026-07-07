from rest_framework import serializers

from .models import Customer, CustomerTask, DemandProfile, Interaction


class DemandProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandProfile
        fields = "__all__"


class CustomerSerializer(serializers.ModelSerializer):
    demand_profile = DemandProfileSerializer(read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = "__all__"

    def get_owner_name(self, customer):
        return customer.owner.get_full_name() or customer.owner.username if customer.owner else ""


class InteractionSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Interaction
        fields = "__all__"
        read_only_fields = ("created_by",)

    def get_created_by_name(self, interaction):
        return interaction.created_by.get_full_name() or interaction.created_by.username if interaction.created_by else ""


class CustomerTaskSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")
    owner_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerTask
        fields = "__all__"

    def get_owner_name(self, task):
        return task.owner.get_full_name() or task.owner.username if task.owner else ""
