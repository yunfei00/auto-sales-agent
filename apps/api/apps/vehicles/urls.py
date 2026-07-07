from rest_framework.routers import DefaultRouter

from .views import (
    BrandViewSet,
    SalesPolicyViewSet,
    VehicleInventoryViewSet,
    VehicleModelViewSet,
    VehicleSeriesViewSet,
    VehicleTrimViewSet,
)

router = DefaultRouter()
router.register("brands", BrandViewSet)
router.register("series", VehicleSeriesViewSet)
router.register("models", VehicleModelViewSet)
router.register("trims", VehicleTrimViewSet)
router.register("inventory", VehicleInventoryViewSet)
router.register("policies", SalesPolicyViewSet)

urlpatterns = router.urls
