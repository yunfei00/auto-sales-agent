from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class LeadSource(TimeStampedModel):
    name = models.CharField(max_length=120)
    code = models.SlugField(max_length=64, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class LeadImportJob(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="lead_import_jobs")
    source = models.ForeignKey(LeadSource, on_delete=models.SET_NULL, null=True, blank=True)
    file = models.FileField(upload_to="lead_imports/", blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.PENDING)
    total_rows = models.PositiveIntegerField(default=0)
    imported_rows = models.PositiveIntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Import {self.id} ({self.status})"


class Lead(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "New"
        QUALIFIED = "qualified", "Qualified"
        DUPLICATE = "duplicate", "Duplicate"
        INVALID = "invalid", "Invalid"
        CONVERTED = "converted", "Converted"

    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="leads")
    store = models.ForeignKey("tenants.Store", on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    source = models.ForeignKey(LeadSource, on_delete=models.SET_NULL, null=True, blank=True)
    import_job = models.ForeignKey(LeadImportJob, on_delete=models.SET_NULL, null=True, blank=True, related_name="leads")
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    customer = models.ForeignKey("customers.Customer", on_delete=models.SET_NULL, null=True, blank=True, related_name="source_leads")
    name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    city = models.CharField(max_length=80, blank=True)
    intent_model = models.CharField(max_length=120, blank=True)
    budget_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    purchase_timeline = models.CharField(max_length=80, blank=True)
    raw_payload = models.JSONField(default=dict, blank=True)
    ai_tags = models.JSONField(default=list, blank=True)
    score = models.PositiveSmallIntegerField(default=0)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.NEW)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "status"]),
            models.Index(fields=["phone"]),
        ]

    def __str__(self) -> str:
        return self.name or self.phone or f"Lead {self.id}"

# Create your models here.
