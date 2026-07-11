from rest_framework import viewsets

from common.security import apply_user_scope

from .models import Customer, CustomerTask, DemandProfile, Interaction
from .serializers import CustomerSerializer, CustomerTaskSerializer, DemandProfileSerializer, InteractionSerializer
from .services.customer_scoring import recalculate_customer_level_safely


def _request_user(request):
    return request.user if request.user.is_authenticated else None


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.select_related("tenant", "store", "owner").prefetch_related("interactions", "tasks").all()
    serializer_class = CustomerSerializer
    filterset_fields = ("tenant", "store", "stage", "owner", "customer_level", "level_status")
    search_fields = ("name", "phone", "wechat", "source_label", "next_action")
    ordering_fields = (
        "created_at",
        "updated_at",
        "deal_probability",
        "customer_score",
        "level_updated_at",
        "next_action_due_at",
    )

    def get_queryset(self):
        return apply_user_scope(super().get_queryset(), self.request.user)

    def perform_create(self, serializer):
        customer = serializer.save()
        recalculate_customer_level_safely(
            customer.id,
            "customer_created",
            actor=_request_user(self.request),
        )
        customer.refresh_from_db()

    def perform_update(self, serializer):
        customer = serializer.save()
        recalculate_customer_level_safely(
            customer.id,
            "customer_updated",
            actor=_request_user(self.request),
        )
        customer.refresh_from_db()


class DemandProfileViewSet(viewsets.ModelViewSet):
    queryset = DemandProfile.objects.select_related("customer").all()
    serializer_class = DemandProfileSerializer
    filterset_fields = ("energy_type", "body_type", "trade_in_intent")
    search_fields = ("customer__name", "usage_scenario", "ai_summary")

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

    def perform_create(self, serializer):
        profile = serializer.save()
        recalculate_customer_level_safely(
            profile.customer_id,
            "demand_profile_created",
            actor=_request_user(self.request),
        )

    def perform_update(self, serializer):
        old_customer_id = serializer.instance.customer_id
        profile = serializer.save()
        recalculate_customer_level_safely(
            profile.customer_id,
            "demand_profile_updated",
            actor=_request_user(self.request),
        )
        if old_customer_id != profile.customer_id:
            recalculate_customer_level_safely(
                old_customer_id,
                "demand_profile_updated",
                actor=_request_user(self.request),
            )


class InteractionViewSet(viewsets.ModelViewSet):
    queryset = Interaction.objects.select_related("customer", "created_by").all()
    serializer_class = InteractionSerializer
    filterset_fields = ("customer", "channel", "created_by")
    search_fields = ("customer__name", "summary", "ai_summary")
    ordering_fields = ("occurred_at", "created_at")

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

    def perform_create(self, serializer):
        user = _request_user(self.request)
        interaction = serializer.save(created_by=user)
        recalculate_customer_level_safely(
            interaction.customer_id,
            "interaction_created",
            actor=user,
        )

    def perform_update(self, serializer):
        old_customer_id = serializer.instance.customer_id
        interaction = serializer.save()
        recalculate_customer_level_safely(
            interaction.customer_id,
            "interaction_updated",
            actor=_request_user(self.request),
        )
        if old_customer_id != interaction.customer_id:
            recalculate_customer_level_safely(
                old_customer_id,
                "interaction_updated",
                actor=_request_user(self.request),
            )


class CustomerTaskViewSet(viewsets.ModelViewSet):
    queryset = CustomerTask.objects.select_related("customer", "owner").all()
    serializer_class = CustomerTaskSerializer
    filterset_fields = ("customer", "owner", "status", "task_type", "priority")
    search_fields = ("title", "customer__name", "notes")
    ordering_fields = ("due_at", "created_at", "priority")

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

# Create your views here.
