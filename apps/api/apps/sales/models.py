from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class TestDrive(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        BOOKED = "booked", "Booked"
        ARRIVED = "arrived", "Arrived"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey("customers.Customer", on_delete=models.CASCADE, related_name="test_drives")
    inventory = models.ForeignKey("vehicles.VehicleInventory", on_delete=models.SET_NULL, null=True, blank=True)
    consultant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.DRAFT)
    feedback = models.TextField(blank=True)

    class Meta:
        ordering = ["-scheduled_at"]

    def __str__(self) -> str:
        return f"{self.customer.name} test drive at {self.scheduled_at:%Y-%m-%d %H:%M}"


class Quote(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PENDING_APPROVAL = "pending_approval", "Pending approval"
        APPROVED = "approved", "Approved"
        SENT = "sent", "Sent"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"

    customer = models.ForeignKey("customers.Customer", on_delete=models.CASCADE, related_name="quotes")
    inventory = models.ForeignKey("vehicles.VehicleInventory", on_delete=models.SET_NULL, null=True, blank=True)
    consultant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    bare_vehicle_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    insurance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    license_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accessory_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    finance_down_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    finance_monthly_payment = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    landing_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    ai_explanation = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Quote {self.id} for {self.customer.name}"


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        DEPOSIT_PAID = "deposit_paid", "Deposit paid"
        FINANCE_PENDING = "finance_pending", "Finance pending"
        CONTRACT_SIGNED = "contract_signed", "Contract signed"
        FINAL_PAYMENT_PENDING = "final_payment_pending", "Final payment pending"
        READY_FOR_DELIVERY = "ready_for_delivery", "Ready for delivery"
        DELIVERED = "delivered", "Delivered"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    order_number = models.CharField(max_length=40, unique=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.PROTECT, related_name="orders")
    quote = models.ForeignKey(Quote, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    inventory = models.ForeignKey("vehicles.VehicleInventory", on_delete=models.PROTECT, related_name="orders")
    consultant = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    deposit_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    expected_delivery_date = models.DateField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.order_number

# Create your models here.
