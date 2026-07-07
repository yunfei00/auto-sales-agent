from rest_framework.routers import DefaultRouter

from .views import OrderViewSet, QuoteViewSet, TestDriveViewSet

router = DefaultRouter()
router.register("test-drives", TestDriveViewSet)
router.register("quotes", QuoteViewSet)
router.register("orders", OrderViewSet)

urlpatterns = router.urls
