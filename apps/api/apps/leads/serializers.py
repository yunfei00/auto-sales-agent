from rest_framework import serializers

from .models import Lead, LeadImportJob, LeadSource


class LeadSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadSource
        fields = "__all__"


class LeadImportJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadImportJob
        fields = "__all__"
        read_only_fields = ("created_by", "total_rows", "imported_rows", "error_message")


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = "__all__"
