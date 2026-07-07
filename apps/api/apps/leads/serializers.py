from rest_framework import serializers

from apps.tenants.models import Store, Tenant

from .models import Lead, LeadImportJob, LeadSource


class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = "__all__"


class LeadImportJobSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all(), required=False)
    source = serializers.PrimaryKeyRelatedField(queryset=LeadSource.objects.all(), required=False, allow_null=True)

    class Meta:
        model = LeadImportJob
        fields = "__all__"
        read_only_fields = ("created_by", "total_rows", "imported_rows", "error_message")


class LeadSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all(), required=False)
    store = serializers.PrimaryKeyRelatedField(queryset=Store.objects.all(), required=False, allow_null=True)
    source = serializers.PrimaryKeyRelatedField(queryset=LeadSource.objects.all(), required=False, allow_null=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True, default="")
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    source_name = serializers.CharField(source="source.name", read_only=True, default="")
    assigned_to_name = serializers.SerializerMethodField()
    customer_name = serializers.CharField(source="customer.name", read_only=True, default="")

    class Meta:
        model = Lead
        fields = "__all__"

    def get_assigned_to_name(self, lead):
        return lead.assigned_to.get_full_name() or lead.assigned_to.username if lead.assigned_to else ""
