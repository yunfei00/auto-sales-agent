from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        STORE_MANAGER = "store_manager", "Store manager"
        SALES_MANAGER = "sales_manager", "Sales manager"
        SALES_CONSULTANT = "sales_consultant", "Sales consultant"
        FINANCE_INSURANCE = "finance_insurance", "Finance insurance"
        OPERATIONS = "operations", "Operations"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.SET_NULL, null=True, blank=True)
    store = models.ForeignKey("tenants.Store", on_delete=models.SET_NULL, null=True, blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.SALES_CONSULTANT)
    phone = models.CharField(max_length=40, blank=True)

    def __str__(self) -> str:
        return f"{self.user.username} ({self.role})"

# Create your models here.
