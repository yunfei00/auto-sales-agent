from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(_request):
    return JsonResponse({"status": "ok", "service": "auto-sales-agent-api"})

urlpatterns = [
    path("", health_check, name="health-check"),
    path('admin/', admin.site.urls),
    path("api/tenants/", include("apps.tenants.urls")),
    path("api/leads/", include("apps.leads.urls")),
    path("api/customers/", include("apps.customers.urls")),
    path("api/vehicles/", include("apps.vehicles.urls")),
    path("api/sales/", include("apps.sales.urls")),
    path("api/ai/", include("apps.ai_gateway.urls")),
]
