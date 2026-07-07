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
    store_name = serializers.CharField(source="store.name", read_only=True, default="")
    trim_name = serializers.CharField(source="trim.name", read_only=True, default="")
    model_name = serializers.CharField(source="trim.model.name", read_only=True, default="")
    brand_name = serializers.CharField(source="trim.model.series.brand.name", read_only=True, default="")
    title = serializers.SerializerMethodField()

    class Meta:
        model = VehicleInventory
        fields = "__all__"

    def get_title(self, inventory):
        return str(inventory.trim)


class SalesPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesPolicy
        fields = "__all__"
