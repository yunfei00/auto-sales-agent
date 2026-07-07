from rest_framework import viewsets

from .models import Lead, LeadImportJob, LeadSource
from .serializers import LeadImportJobSerializer, LeadSerializer, LeadSourceSerializer


class LeadSourceViewSet(viewsets.ModelViewSet):
    queryset = LeadSource.objects.all()
    serializer_class = LeadSourceSerializer
    search_fields = ("name", "code")


class LeadImportJobViewSet(viewsets.ModelViewSet):
    queryset = LeadImportJob.objects.select_related("tenant", "source", "created_by").all()
    serializer_class = LeadImportJobSerializer
    filterset_fields = ("tenant", "source", "status")
    ordering_fields = ("created_at", "status")

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("tenant", "store", "source", "assigned_to", "customer").all()
    serializer_class = LeadSerializer
    filterset_fields = ("tenant", "store", "source", "status", "assigned_to")
    search_fields = ("name", "phone", "intent_model", "notes")
    ordering_fields = ("created_at", "score", "updated_at")

# Create your views here.
