from rest_framework import viewsets

from .models import Brand, SalesPolicy, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim
from .serializers import (
    BrandSerializer,
    SalesPolicySerializer,
    VehicleInventorySerializer,
    VehicleModelSerializer,
    VehicleSeriesSerializer,
    VehicleTrimSerializer,
)


class BrandViewSet(viewsets.ModelViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    search_fields = ("name", "code", "country")


class VehicleSeriesViewSet(viewsets.ModelViewSet):
    queryset = VehicleSeries.objects.select_related("brand").all()
    serializer_class = VehicleSeriesSerializer
    filterset_fields = ("brand",)
    search_fields = ("name", "brand__name")


class VehicleModelViewSet(viewsets.ModelViewSet):
    queryset = VehicleModel.objects.select_related("series", "series__brand").all()
    serializer_class = VehicleModelSerializer
    filterset_fields = ("series", "energy_type", "body_type", "is_active")
    search_fields = ("name", "series__name", "series__brand__name")
    ordering_fields = ("model_year", "guide_price_min", "guide_price_max")


class VehicleTrimViewSet(viewsets.ModelViewSet):
    queryset = VehicleTrim.objects.select_related("model", "model__series", "model__series__brand").all()
    serializer_class = VehicleTrimSerializer
    filterset_fields = ("model", "is_active")
    search_fields = ("name", "model__name")
    ordering_fields = ("official_price", "range_km", "created_at")


class VehicleInventoryViewSet(viewsets.ModelViewSet):
    queryset = VehicleInventory.objects.select_related("store", "trim", "trim__model").all()
    serializer_class = VehicleInventorySerializer
    filterset_fields = ("store", "trim", "status", "exterior_color", "interior_color")
    search_fields = ("vin", "trim__name", "trim__model__name", "notes")
    ordering_fields = ("arrival_date", "listed_price", "updated_at")


class SalesPolicyViewSet(viewsets.ModelViewSet):
    queryset = SalesPolicy.objects.select_related("store", "model").all()
    serializer_class = SalesPolicySerializer
    filterset_fields = ("store", "model", "policy_type", "is_active")
    search_fields = ("title", "description", "model__name")
    ordering_fields = ("start_date", "end_date", "amount", "created_at")

# Create your views here.
