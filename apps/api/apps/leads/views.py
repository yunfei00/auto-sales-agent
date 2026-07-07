from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.tenants.models import Tenant

from .models import Lead, LeadImportJob, LeadSource
from .serializers import LeadImportJobSerializer, LeadSerializer, LeadSourceSerializer
from .services import import_leads_from_csv


def _request_user(request):
    return request.user if request.user.is_authenticated else None


def _profile(request):
    user = _request_user(request)
    return getattr(user, "profile", None) if user else None


def _default_tenant(request):
    profile = _profile(request)
    return getattr(profile, "tenant", None) or Tenant.objects.filter(is_active=True).first()


def _default_store(request, tenant=None):
    profile = _profile(request)
    if getattr(profile, "store", None):
        return profile.store
    tenant = tenant or _default_tenant(request)
    return tenant.stores.filter(is_active=True).first() if tenant else None


def _source(code: str, name: str):
    return LeadSource.objects.get_or_create(code=code, defaults={"name": name})[0]


class LeadSourceViewSet(viewsets.ModelViewSet):
    queryset = LeadSource.objects.all()
    serializer_class = LeadSourceSerializer
    search_fields = ("name", "code")


class LeadImportJobViewSet(viewsets.ModelViewSet):
    queryset = LeadImportJob.objects.select_related("tenant", "source", "created_by").all()
    serializer_class = LeadImportJobSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    filterset_fields = ("tenant", "source", "status")
    ordering_fields = ("created_at", "status")

    def perform_create(self, serializer):
        user = _request_user(self.request)
        tenant = serializer.validated_data.get("tenant") or _default_tenant(self.request)
        if not tenant:
            raise ValidationError({"tenant": "请先创建租户或为当前用户绑定租户。"})
        source = serializer.validated_data.get("source") or _source("csv", "CSV 导入")
        uploaded_file = serializer.validated_data.get("file")
        job = serializer.save(
            tenant=tenant,
            source=source,
            original_filename=getattr(uploaded_file, "name", "") if uploaded_file else "",
            created_by=user,
            status=LeadImportJob.Status.PROCESSING if uploaded_file else LeadImportJob.Status.PENDING,
        )
        if uploaded_file:
            import_leads_from_csv(job, store=_default_store(self.request, tenant), assigned_to=user)
            job.refresh_from_db()
            serializer.instance = job


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.select_related("tenant", "store", "source", "assigned_to", "customer").all()
    serializer_class = LeadSerializer
    filterset_fields = ("tenant", "store", "source", "status", "assigned_to")
    search_fields = ("name", "phone", "intent_model", "notes")
    ordering_fields = ("created_at", "score", "updated_at")

    def perform_create(self, serializer):
        user = _request_user(self.request)
        tenant = serializer.validated_data.get("tenant") or _default_tenant(self.request)
        if not tenant:
            raise ValidationError({"tenant": "请先创建租户或为当前用户绑定租户。"})
        serializer.save(
            tenant=tenant,
            store=serializer.validated_data.get("store") or _default_store(self.request, tenant),
            source=serializer.validated_data.get("source") or _source("manual", "手工录入"),
            assigned_to=serializer.validated_data.get("assigned_to") or user,
        )

# Create your views here.
