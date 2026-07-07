from rest_framework.routers import DefaultRouter

from .views import StoreViewSet, TenantViewSet

router = DefaultRouter()
router.register("tenants", TenantViewSet)
router.register("stores", StoreViewSet)

urlpatterns = router.urls
