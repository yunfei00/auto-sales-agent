from rest_framework import serializers

from common.security import user_can_access_customer, user_profile_scope

from .models import Customer, CustomerTask, DemandProfile, Interaction


class CustomerRelationScopeMixin:
    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        customer = attrs.get("customer") or getattr(self.instance, "customer", None)
        if request and customer and not user_can_access_customer(request.user, customer):
            raise serializers.ValidationError({"customer": "Customer is outside your tenant/store scope."})
        return attrs


class DemandProfileSerializer(CustomerRelationScopeMixin, serializers.ModelSerializer):
    class Meta:
        model = DemandProfile
        fields = "__all__"


class CustomerSerializer(serializers.ModelSerializer):
    demand_profile = DemandProfileSerializer(read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    owner_name = serializers.SerializerMethodField()
    customer_level_display = serializers.CharField(source="get_customer_level_display", read_only=True)

    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = (
            "customer_level",
            "customer_score",
            "level_status",
            "score_breakdown",
            "level_reason",
            "level_updated_at",
            "scoring_version",
        )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        tenant = attrs.get("tenant") or getattr(self.instance, "tenant", None)
        store = attrs.get("store", getattr(self.instance, "store", None))
        if store and tenant and store.tenant_id != tenant.id:
            raise serializers.ValidationError({"store": "Store must belong to the selected tenant."})

        request = self.context.get("request")
        if not request:
            return attrs
        scoped_tenant, scoped_store, unrestricted = user_profile_scope(request.user)
        if unrestricted:
            return attrs
        if scoped_store and (not store or store.id != scoped_store.id):
            raise serializers.ValidationError({"store": "Store is outside your access scope."})
        if scoped_tenant and (not tenant or tenant.id != scoped_tenant.id):
            raise serializers.ValidationError({"tenant": "Tenant is outside your access scope."})
        if not scoped_store and not scoped_tenant:
            raise serializers.ValidationError({"tenant": "Current user is not assigned to a tenant."})
        return attrs

    def get_owner_name(self, customer):
        return customer.owner.get_full_name() or customer.owner.username if customer.owner else ""


class InteractionSerializer(CustomerRelationScopeMixin, serializers.ModelSerializer):
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
