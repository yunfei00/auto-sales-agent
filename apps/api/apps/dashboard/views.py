from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.security import apply_user_scope
from apps.customers.models import Customer, CustomerTask
from apps.leads.models import Lead
from apps.sales.models import Order, Quote, TestDrive
from apps.vehicles.models import VehicleInventory


def _decimal_text(value):
    amount = value if value is not None else Decimal("0")
    return f"{amount.quantize(Decimal('0.01'))}"


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    now = timezone.now()
    today = timezone.localdate()
    leads = apply_user_scope(Lead.objects.all(), request.user)
    customers = apply_user_scope(Customer.objects.all(), request.user)
    tasks = apply_user_scope(
        CustomerTask.objects.all(),
        request.user,
        tenant_path="customer__tenant",
        store_path="customer__store",
    )
    quotes = apply_user_scope(
        Quote.objects.all(),
        request.user,
        tenant_path="customer__tenant",
        store_path="customer__store",
    )
    test_drives = apply_user_scope(
        TestDrive.objects.all(),
        request.user,
        tenant_path="customer__tenant",
        store_path="customer__store",
    )
    orders = apply_user_scope(
        Order.objects.all(),
        request.user,
        tenant_path="customer__tenant",
        store_path="customer__store",
    )
    inventory = apply_user_scope(VehicleInventory.objects.all(), request.user, tenant_path="store__tenant")
    quote_pipeline = quotes.exclude(status=Quote.Status.REJECTED).aggregate(total=Sum("landing_price"))["total"]

    return Response(
        {
            "updated_at": now.isoformat(),
            "leads": {
                "total": leads.count(),
                "today": leads.filter(created_at__date=today).count(),
                "high_intent": leads.filter(score__gte=80).count(),
                "converted": leads.filter(status=Lead.Status.CONVERTED).count(),
            },
            "customers": {
                "total": customers.count(),
                "quoted": customers.filter(stage=Customer.Stage.QUOTED).count(),
                "test_drive_booked": customers.filter(stage=Customer.Stage.TEST_DRIVE_BOOKED).count(),
            },
            "tasks": {
                "open": tasks.filter(status=CustomerTask.Status.OPEN).count(),
                "overdue": tasks.filter(status=CustomerTask.Status.OPEN, due_at__lt=now).count(),
            },
            "sales": {
                "quotes": quotes.count(),
                "quote_pipeline": _decimal_text(quote_pipeline),
                "test_drives_today": test_drives.filter(scheduled_at__date=today).count(),
                "test_drives_booked": test_drives.filter(
                    status=TestDrive.Status.BOOKED,
                    scheduled_at__gte=now,
                ).count(),
                "orders": orders.count(),
                "delivered_orders": orders.filter(
                    status__in=[Order.Status.DELIVERED, Order.Status.COMPLETED],
                ).count(),
            },
            "inventory": {
                "available": inventory.filter(status=VehicleInventory.Status.AVAILABLE).count(),
                "in_transit": inventory.filter(status=VehicleInventory.Status.IN_TRANSIT).count(),
                "reserved": inventory.filter(status=VehicleInventory.Status.RESERVED).count(),
            },
        }
    )
