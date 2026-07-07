from rest_framework.routers import DefaultRouter

from .views import CustomerTaskViewSet, CustomerViewSet, DemandProfileViewSet, InteractionViewSet

router = DefaultRouter()
router.register("demand-profiles", DemandProfileViewSet)
router.register("interactions", InteractionViewSet)
router.register("tasks", CustomerTaskViewSet)
router.register("", CustomerViewSet)

urlpatterns = router.urls
