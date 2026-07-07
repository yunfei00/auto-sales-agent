from rest_framework import viewsets

from .models import Order, Quote, TestDrive
from .serializers import OrderSerializer, QuoteSerializer, TestDriveSerializer


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

# Create your views here.
