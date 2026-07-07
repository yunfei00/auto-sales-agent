from rest_framework import viewsets

from .models import Store, Tenant
from .serializers import StoreSerializer, TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    search_fields = ("name", "code")
    ordering_fields = ("name", "created_at")


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related("tenant").all()
    serializer_class = StoreSerializer
    filterset_fields = ("tenant", "city", "is_active")
    search_fields = ("name", "code", "city", "address")
    ordering_fields = ("name", "created_at")

# Create your views here.
