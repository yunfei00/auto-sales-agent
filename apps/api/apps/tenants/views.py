from rest_framework import viewsets

from common.security import apply_user_scope

from .models import Store, Tenant
from .serializers import StoreSerializer, TenantSerializer


class TenantViewSet(viewsets.ModelViewSet):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    search_fields = ("name", "code")
    ordering_fields = ("name", "created_at")

    def get_queryset(self):
        return apply_user_scope(super().get_queryset(), self.request.user, tenant_path="id", store_path=None)


class StoreViewSet(viewsets.ModelViewSet):
    queryset = Store.objects.select_related("tenant").all()
    serializer_class = StoreSerializer
    filterset_fields = ("tenant", "city", "is_active")
    search_fields = ("name", "code", "city", "address")
    ordering_fields = ("name", "created_at")

    def get_queryset(self):
        return apply_user_scope(super().get_queryset(), self.request.user, tenant_path="tenant", store_path="id")

# Create your views here.
