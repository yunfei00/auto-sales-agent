from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Customer(TimeStampedModel):
    class Stage(models.TextChoices):
        NEW_LEAD = "new_lead", "New lead"
        QUALIFIED = "qualified", "Qualified"
        CONTACTED = "contacted", "Contacted"
        INVITED = "invited", "Invited"
        TEST_DRIVE_BOOKED = "test_drive_booked", "Test drive booked"
        TEST_DRIVEN = "test_driven", "Test driven"
        QUOTED = "quoted", "Quoted"
        DEPOSIT_PAID = "deposit_paid", "Deposit paid"
        CONTRACT_SIGNED = "contract_signed", "Contract signed"
        DELIVERED = "delivered", "Delivered"
        LOST = "lost", "Lost"

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="customers")
    store = models.ForeignKey("tenants.Store", on_delete=models.SET_NULL, null=True, blank=True, related_name="customers")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=40, blank=True)
    wechat = models.CharField(max_length=80, blank=True)
    city = models.CharField(max_length=80, blank=True)
    source_label = models.CharField(max_length=80, blank=True)
    stage = models.CharField(max_length=32, choices=Stage.choices, default=Stage.NEW_LEAD)
    tags = models.JSONField(default=list, blank=True)
    deal_probability = models.PositiveSmallIntegerField(default=0)
    next_action = models.CharField(max_length=255, blank=True)
    next_action_due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "stage"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self) -> str:
        return self.name


class DemandProfile(TimeStampedModel):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name="demand_profile")
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    energy_type = models.CharField(max_length=40, blank=True)
    body_type = models.CharField(max_length=40, blank=True)
    seats = models.PositiveSmallIntegerField(null=True, blank=True)
    preferred_brands = models.JSONField(default=list, blank=True)
    preferred_models = models.JSONField(default=list, blank=True)
    usage_scenario = models.CharField(max_length=120, blank=True)
    payment_preference = models.CharField(max_length=80, blank=True)
    trade_in_intent = models.BooleanField(default=False)
    purchase_timeline = models.CharField(max_length=80, blank=True)
    key_concerns = models.JSONField(default=list, blank=True)
    competitor_models = models.JSONField(default=list, blank=True)
    ai_summary = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"Demand profile for {self.customer.name}"


class Interaction(TimeStampedModel):
    class Channel(models.TextChoices):
        WECHAT = "wechat", "Wechat"
        PHONE = "phone", "Phone"
        STORE_VISIT = "store_visit", "Store visit"
        WEBSITE = "website", "Website"
        OTHER = "other", "Other"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="interactions")
    channel = models.CharField(max_length=32, choices=Channel.choices, default=Channel.OTHER)
    occurred_at = models.DateTimeField()
    summary = models.TextField()
    raw_content = models.TextField(blank=True)
    ai_summary = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-occurred_at"]

    def __str__(self) -> str:
        return f"{self.customer.name} / {self.channel}"


class CustomerTask(TimeStampedModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        DONE = "done", "Done"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="tasks")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=160)
    task_type = models.CharField(max_length=60, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    priority = models.PositiveSmallIntegerField(default=2)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.OPEN)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["status", "due_at", "-created_at"]

    def __str__(self) -> str:
        return self.title

# Create your models here.
