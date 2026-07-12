from django.utils import timezone
from rest_framework import viewsets

from common.security import apply_user_scope
from apps.customers.models import Customer
from apps.customers.services.customer_scoring import recalculate_customer_level_safely

from .models import Order, Quote, TestDrive
from .serializers import OrderSerializer, QuoteSerializer, TestDriveSerializer


def _request_user(request):
    return request.user if request.user.is_authenticated else None


_STAGE_RANK = {
    Customer.Stage.NEW_LEAD: 0,
    Customer.Stage.CONTACTED: 1,
    Customer.Stage.QUALIFIED: 2,
    Customer.Stage.INVITED: 3,
    Customer.Stage.TEST_DRIVE_BOOKED: 4,
    Customer.Stage.TEST_DRIVEN: 5,
    Customer.Stage.QUOTED: 6,
    Customer.Stage.DEPOSIT_PAID: 7,
    Customer.Stage.CONTRACT_SIGNED: 8,
    Customer.Stage.DELIVERED: 9,
}


def _advance_customer_stage(
    customer_id: int,
    *,
    stage: str,
    next_action: str,
    next_action_due_at=None,
) -> None:
    """Advance the sales pipeline without reopening or regressing a customer."""
    customer = Customer.objects.only("stage").filter(pk=customer_id).first()
    if customer is None or customer.stage == Customer.Stage.LOST:
        return

    current_rank = _STAGE_RANK.get(customer.stage, -1)
    target_rank = _STAGE_RANK[stage]
    if current_rank > target_rank:
        return

    # Match the observed stage so a concurrent progression cannot be overwritten.
    Customer.objects.filter(pk=customer_id, stage=customer.stage).update(
        stage=stage,
        next_action=next_action,
        next_action_due_at=next_action_due_at,
    )


def _sync_test_drive_stage(test_drive: TestDrive) -> None:
    if test_drive.status == TestDrive.Status.COMPLETED:
        _advance_customer_stage(
            test_drive.customer_id,
            stage=Customer.Stage.TEST_DRIVEN,
            next_action="试驾后回访并确认报价意向",
        )
    elif test_drive.status in {TestDrive.Status.BOOKED, TestDrive.Status.ARRIVED}:
        _advance_customer_stage(
            test_drive.customer_id,
            stage=Customer.Stage.TEST_DRIVE_BOOKED,
            next_action="试驾前确认到店时间",
            next_action_due_at=test_drive.scheduled_at,
        )


def _record_test_drive_completion(test_drive: TestDrive, previous_status: str | None) -> None:
    if test_drive.status != TestDrive.Status.COMPLETED or previous_status == TestDrive.Status.COMPLETED:
        return
    completed_at = timezone.now()
    TestDrive.objects.filter(pk=test_drive.pk).update(completed_at=completed_at)
    test_drive.completed_at = completed_at


def _sync_quote_stage(quote: Quote) -> None:
    # Existing workflow treats a generated draft quote as entering the quoted stage.
    _advance_customer_stage(
        quote.customer_id,
        stage=Customer.Stage.QUOTED,
        next_action="发送报价并确认订金意向",
    )


def _record_quote_sent(quote: Quote, previous_status: str | None) -> None:
    if quote.status != Quote.Status.SENT or previous_status == Quote.Status.SENT:
        return
    sent_at = timezone.now()
    Quote.objects.filter(pk=quote.pk).update(sent_at=sent_at)
    quote.sent_at = sent_at


def _sync_order_stage(order: Order) -> None:
    stage_updates = {
        Order.Status.DEPOSIT_PAID: (
            Customer.Stage.DEPOSIT_PAID,
            "推进合同签署和交付准备",
        ),
        Order.Status.CONTRACT_SIGNED: (
            Customer.Stage.CONTRACT_SIGNED,
            "确认尾款和交付准备",
        ),
        Order.Status.FINAL_PAYMENT_PENDING: (
            Customer.Stage.CONTRACT_SIGNED,
            "确认尾款和交付准备",
        ),
        Order.Status.READY_FOR_DELIVERY: (
            Customer.Stage.CONTRACT_SIGNED,
            "确认交付时间和交车准备",
        ),
        Order.Status.DELIVERED: (
            Customer.Stage.DELIVERED,
            "完成交付回访和售后衔接",
        ),
        Order.Status.COMPLETED: (
            Customer.Stage.DELIVERED,
            "完成交付回访和售后衔接",
        ),
    }
    stage_update = stage_updates.get(order.status)
    if stage_update is None:
        return
    stage, next_action = stage_update
    _advance_customer_stage(order.customer_id, stage=stage, next_action=next_action)


def _recalculate_for_update(*, old_customer_id: int, customer_id: int, trigger: str, actor) -> None:
    recalculate_customer_level_safely(customer_id, trigger, actor=actor)
    if old_customer_id != customer_id:
        recalculate_customer_level_safely(old_customer_id, trigger, actor=actor)


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

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

    def perform_create(self, serializer):
        actor = _request_user(self.request)
        test_drive = serializer.save(consultant=actor)
        _record_test_drive_completion(test_drive, previous_status=None)
        _sync_test_drive_stage(test_drive)
        recalculate_customer_level_safely(
            test_drive.customer_id,
            "test_drive_created",
            actor=actor,
        )

    def perform_update(self, serializer):
        actor = _request_user(self.request)
        old_customer_id = serializer.instance.customer_id
        previous_status = serializer.instance.status
        test_drive = serializer.save()
        _record_test_drive_completion(test_drive, previous_status=previous_status)
        _sync_test_drive_stage(test_drive)
        _recalculate_for_update(
            old_customer_id=old_customer_id,
            customer_id=test_drive.customer_id,
            trigger="test_drive_updated",
            actor=actor,
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

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

    def perform_create(self, serializer):
        actor = _request_user(self.request)
        quote = serializer.save(consultant=actor)
        _record_quote_sent(quote, previous_status=None)
        _sync_quote_stage(quote)
        recalculate_customer_level_safely(
            quote.customer_id,
            "quote_created",
            actor=actor,
        )

    def perform_update(self, serializer):
        actor = _request_user(self.request)
        old_customer_id = serializer.instance.customer_id
        previous_status = serializer.instance.status
        quote = serializer.save()
        _record_quote_sent(quote, previous_status=previous_status)
        _sync_quote_stage(quote)
        _recalculate_for_update(
            old_customer_id=old_customer_id,
            customer_id=quote.customer_id,
            trigger="quote_updated",
            actor=actor,
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

    def get_queryset(self):
        return apply_user_scope(
            super().get_queryset(),
            self.request.user,
            tenant_path="customer__tenant",
            store_path="customer__store",
        )

    def perform_create(self, serializer):
        actor = _request_user(self.request)
        order = serializer.save(consultant=actor)
        _sync_order_stage(order)
        recalculate_customer_level_safely(
            order.customer_id,
            "order_created",
            actor=actor,
        )

    def perform_update(self, serializer):
        actor = _request_user(self.request)
        old_customer_id = serializer.instance.customer_id
        order = serializer.save()
        _sync_order_stage(order)
        _recalculate_for_update(
            old_customer_id=old_customer_id,
            customer_id=order.customer_id,
            trigger="order_updated",
            actor=actor,
        )

# Create your views here.
