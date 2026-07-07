from django.contrib import admin
from django.http import JsonResponse
from django.conf import settings
from django.http import FileResponse
from django.urls import include, path


def health_check(_request):
    return JsonResponse({"status": "ok", "service": "auto-sales-agent-api"})


def frontend_app(_request):
    index_path = settings.FRONTEND_DIST_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path.open("rb"), content_type="text/html")
    return JsonResponse({"status": "ok", "service": "auto-sales-agent-api", "frontend": "not_built"})

urlpatterns = [
    path("", frontend_app, name="frontend-app"),
    path("api/health/", health_check, name="health-check"),
    path('admin/', admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/tenants/", include("apps.tenants.urls")),
    path("api/leads/", include("apps.leads.urls")),
    path("api/customers/", include("apps.customers.urls")),
    path("api/vehicles/", include("apps.vehicles.urls")),
    path("api/sales/", include("apps.sales.urls")),
    path("api/ai/", include("apps.ai_gateway.urls")),
]
