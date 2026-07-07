from django.db import models

from common.models import TimeStampedModel


class Tenant(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Store(TimeStampedModel):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name="stores")
    name = models.CharField(max_length=120)
    code = models.SlugField(max_length=64)
    city = models.CharField(max_length=80, blank=True)
    address = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=40, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["tenant__name", "name"]
        unique_together = [("tenant", "code")]

    def __str__(self) -> str:
        return f"{self.tenant.name} / {self.name}"

# Create your models here.
