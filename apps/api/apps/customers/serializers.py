from rest_framework import serializers

from .models import Customer, CustomerTask, DemandProfile, Interaction


class DemandProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DemandProfile
        fields = "__all__"


class CustomerSerializer(serializers.ModelSerializer):
    demand_profile = DemandProfileSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = "__all__"


class InteractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interaction
        fields = "__all__"
        read_only_fields = ("created_by",)


class CustomerTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerTask
        fields = "__all__"
