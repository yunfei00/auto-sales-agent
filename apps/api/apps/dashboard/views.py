from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from apps.customers.models import Customer, CustomerTask
from apps.leads.models import Lead
from apps.sales.models import Order, Quote, TestDrive
from apps.vehicles.models import VehicleInventory


def _decimal_text(value):
    amount = value if value is not None else Decimal("0")
    return f"{amount.quantize(Decimal('0.01'))}"


@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def summary(_request):
    now = timezone.now()
    today = timezone.localdate()
    quote_pipeline = Quote.objects.exclude(status=Quote.Status.REJECTED).aggregate(total=Sum("landing_price"))["total"]

    return Response(
        {
            "updated_at": now.isoformat(),
            "leads": {
                "total": Lead.objects.count(),
                "today": Lead.objects.filter(created_at__date=today).count(),
                "high_intent": Lead.objects.filter(score__gte=80).count(),
                "converted": Lead.objects.filter(status=Lead.Status.CONVERTED).count(),
            },
            "customers": {
                "total": Customer.objects.count(),
                "quoted": Customer.objects.filter(stage=Customer.Stage.QUOTED).count(),
                "test_drive_booked": Customer.objects.filter(stage=Customer.Stage.TEST_DRIVE_BOOKED).count(),
            },
            "tasks": {
                "open": CustomerTask.objects.filter(status=CustomerTask.Status.OPEN).count(),
                "overdue": CustomerTask.objects.filter(status=CustomerTask.Status.OPEN, due_at__lt=now).count(),
            },
            "sales": {
                "quotes": Quote.objects.count(),
                "quote_pipeline": _decimal_text(quote_pipeline),
                "test_drives_today": TestDrive.objects.filter(scheduled_at__date=today).count(),
                "test_drives_booked": TestDrive.objects.filter(
                    status=TestDrive.Status.BOOKED,
                    scheduled_at__gte=now,
                ).count(),
                "orders": Order.objects.count(),
                "delivered_orders": Order.objects.filter(
                    status__in=[Order.Status.DELIVERED, Order.Status.COMPLETED],
                ).count(),
            },
            "inventory": {
                "available": VehicleInventory.objects.filter(status=VehicleInventory.Status.AVAILABLE).count(),
                "in_transit": VehicleInventory.objects.filter(status=VehicleInventory.Status.IN_TRANSIT).count(),
                "reserved": VehicleInventory.objects.filter(status=VehicleInventory.Status.RESERVED).count(),
            },
        }
    )
