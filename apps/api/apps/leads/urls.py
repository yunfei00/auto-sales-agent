from rest_framework.routers import DefaultRouter

from .views import LeadImportJobViewSet, LeadSourceViewSet, LeadViewSet

router = DefaultRouter()
router.register("sources", LeadSourceViewSet)
router.register("imports", LeadImportJobViewSet)
router.register("", LeadViewSet)

urlpatterns = router.urls
