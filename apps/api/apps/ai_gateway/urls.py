from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AIConversationViewSet,
    AIToolCallViewSet,
    chat,
    followup_script,
    quote_suggestion,
    vehicle_recommendations,
)

router = DefaultRouter()
router.register("conversations", AIConversationViewSet)
router.register("tool-calls", AIToolCallViewSet)

urlpatterns = [
    path("chat/", chat, name="ai-chat"),
    path("recommendations/vehicles/", vehicle_recommendations, name="ai-vehicle-recommendations"),
    path("followups/generate/", followup_script, name="ai-followup-script"),
    path("quotes/suggest/", quote_suggestion, name="ai-quote-suggestion"),
]
urlpatterns += router.urls
