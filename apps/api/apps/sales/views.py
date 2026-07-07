from rest_framework import viewsets

from apps.customers.models import Customer

from .models import Order, Quote, TestDrive
from .serializers import OrderSerializer, QuoteSerializer, TestDriveSerializer


def _request_user(request):
    return request.user if request.user.is_authenticated else None


class TestDriveViewSet(viewsets.ModelViewSet):
    queryset = TestDrive.objects.select_related(
        "customer",
        "inventory",
        "inventory__trim",
        "inventory__trim__model",
        "inventory__trim__model__series",
        "inventory__trim__model__series__brand",
        "consultant",
    ).all()
    serializer_class = TestDriveSerializer
    filterset_fields = ("customer", "inventory", "consultant", "status")
    search_fields = ("customer__name", "inventory__vin", "feedback")
    ordering_fields = ("scheduled_at", "created_at")

    def perform_create(self, serializer):
        test_drive = serializer.save(consultant=_request_user(self.request))
        Customer.objects.filter(pk=test_drive.customer_id).update(
            stage=Customer.Stage.TEST_DRIVE_BOOKED,
            next_action="试驾前确认到店时间",
            next_action_due_at=test_drive.scheduled_at,
        )


class QuoteViewSet(viewsets.ModelViewSet):
    queryset = Quote.objects.select_related(
        "customer",
        "inventory",
        "inventory__trim",
        "inventory__trim__model",
        "inventory__trim__model__series",
        "inventory__trim__model__series__brand",
        "consultant",
    ).all()
    serializer_class = QuoteSerializer
    filterset_fields = ("customer", "inventory", "consultant", "status")
    search_fields = ("customer__name", "inventory__vin", "ai_explanation", "notes")
    ordering_fields = ("created_at", "landing_price")

    def perform_create(self, serializer):
        quote = serializer.save(consultant=_request_user(self.request))
        Customer.objects.filter(pk=quote.customer_id).update(
            stage=Customer.Stage.QUOTED,
            next_action="发送报价并确认订金意向",
        )


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related(
        "customer",
        "quote",
        "inventory",
        "inventory__trim",
        "inventory__trim__model",
        "inventory__trim__model__series",
        "inventory__trim__model__series__brand",
        "consultant",
    ).all()
    serializer_class = OrderSerializer
    filterset_fields = ("customer", "inventory", "consultant", "status")
    search_fields = ("order_number", "customer__name", "inventory__vin", "notes")
    ordering_fields = ("created_at", "expected_delivery_date", "total_amount")

    def perform_create(self, serializer):
        order = serializer.save(consultant=_request_user(self.request))
        Customer.objects.filter(pk=order.customer_id).update(
            stage=Customer.Stage.DEPOSIT_PAID,
            next_action="推进合同签署和交付准备",
        )

# Create your views here.
