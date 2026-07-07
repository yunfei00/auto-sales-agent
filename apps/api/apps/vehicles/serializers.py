from rest_framework import serializers

from .models import Brand, SalesPolicy, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim


class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brand
        fields = "__all__"


class VehicleSeriesSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleSeries
        fields = "__all__"


class VehicleModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleModel
        fields = "__all__"


class VehicleTrimSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleTrim
        fields = "__all__"


class VehicleInventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleInventory
        fields = "__all__"


class SalesPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesPolicy
        fields = "__all__"
