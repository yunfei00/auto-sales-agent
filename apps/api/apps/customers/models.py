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

    class Level(models.TextChoices):
        N = "n", "N"
        D = "d", "D"
        C = "c", "C"
        B = "b", "B"
        A = "a", "A"
        A_PLUS = "a_plus", "A+"

    class LevelStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"

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
    customer_level = models.CharField(max_length=16, choices=Level.choices, default=Level.N)
    customer_score = models.PositiveSmallIntegerField(default=0)
    level_status = models.CharField(max_length=16, choices=LevelStatus.choices, default=LevelStatus.PENDING)
    score_breakdown = models.JSONField(default=dict, blank=True)
    level_reason = models.TextField(blank=True)
    level_updated_at = models.DateTimeField(null=True, blank=True)
    scoring_version = models.CharField(max_length=16, default="v1")

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["tenant", "stage"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["tenant", "level_status", "customer_level"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(customer_score__gte=0, customer_score__lte=100),
                name="customer_score_between_0_and_100",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class CustomerLevelHistory(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name="level_history")
    old_level = models.CharField(max_length=16, choices=Customer.Level.choices)
    new_level = models.CharField(max_length=16, choices=Customer.Level.choices)
    old_score = models.PositiveSmallIntegerField()
    new_score = models.PositiveSmallIntegerField()
    trigger = models.CharField(max_length=120)
    score_breakdown = models.JSONField(default=dict)
    reason = models.TextField(blank=True)
    scoring_version = models.CharField(max_length=16, default="v1")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_level_changes",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["customer", "created_at"])]

    def __str__(self) -> str:
        return f"{self.customer}: {self.old_level} -> {self.new_level}"


class DemandProfile(TimeStampedModel):
    class PurchaseTimeline(models.TextChoices):
        WITHIN_7_DAYS = "within_7_days", "Within 7 days"
        DAYS_8_TO_15 = "8_to_15_days", "8 to 15 days"
        DAYS_16_TO_30 = "16_to_30_days", "16 to 30 days"
        DAYS_31_TO_60 = "31_to_60_days", "31 to 60 days"
        DAYS_61_TO_90 = "61_to_90_days", "61 to 90 days"
        OVER_90_DAYS = "over_90_days", "Over 90 days"

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
    purchase_timeline_bucket = models.CharField(
        max_length=24,
        choices=PurchaseTimeline.choices,
        blank=True,
        default="",
    )
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
