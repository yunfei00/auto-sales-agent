from django.db import models

from common.models import TimeStampedModel


class Brand(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    code = models.SlugField(max_length=64, unique=True)
    country = models.CharField(max_length=80, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class VehicleSeries(TimeStampedModel):
    brand = models.ForeignKey(Brand, on_delete=models.CASCADE, related_name="series")
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["brand__name", "name"]
        unique_together = [("brand", "name")]

    def __str__(self) -> str:
        return f"{self.brand.name} {self.name}"


class VehicleModel(TimeStampedModel):
    class EnergyType(models.TextChoices):
        ICE = "ice", "Fuel"
        BEV = "bev", "Battery electric"
        PHEV = "phev", "Plug-in hybrid"
        HEV = "hev", "Hybrid"
        EREV = "erev", "Range extended"

    series = models.ForeignKey(VehicleSeries, on_delete=models.CASCADE, related_name="models")
    name = models.CharField(max_length=120)
    model_year = models.PositiveSmallIntegerField()
    body_type = models.CharField(max_length=60, blank=True)
    energy_type = models.CharField(max_length=24, choices=EnergyType.choices, default=EnergyType.BEV)
    seats = models.PositiveSmallIntegerField(default=5)
    guide_price_min = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    guide_price_max = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    highlights = models.JSONField(default=list, blank=True)
    competitor_models = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["series__brand__name", "series__name", "-model_year", "name"]

    def __str__(self) -> str:
        return f"{self.series} {self.name} {self.model_year}"


class VehicleTrim(TimeStampedModel):
    model = models.ForeignKey(VehicleModel, on_delete=models.CASCADE, related_name="trims")
    name = models.CharField(max_length=120)
    official_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    range_km = models.PositiveIntegerField(null=True, blank=True)
    configuration = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["model", "official_price"]

    def __str__(self) -> str:
        return f"{self.model} {self.name}"


class VehicleInventory(TimeStampedModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        RESERVED = "reserved", "Reserved"
        SOLD = "sold", "Sold"
        IN_TRANSIT = "in_transit", "In transit"
        TEST_DRIVE = "test_drive", "Test drive"

    store = models.ForeignKey("tenants.Store", on_delete=models.CASCADE, related_name="vehicle_inventory")
    trim = models.ForeignKey(VehicleTrim, on_delete=models.PROTECT, related_name="inventory")
    vin = models.CharField(max_length=32, unique=True)
    exterior_color = models.CharField(max_length=80, blank=True)
    interior_color = models.CharField(max_length=80, blank=True)
    status = models.CharField(max_length=24, choices=Status.choices, default=Status.AVAILABLE)
    arrival_date = models.DateField(null=True, blank=True)
    listed_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    negotiable_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    mileage_km = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["status", "arrival_date", "trim__model__name"]
        indexes = [
            models.Index(fields=["store", "status"]),
            models.Index(fields=["vin"]),
        ]

    def __str__(self) -> str:
        return f"{self.vin} / {self.trim}"


class SalesPolicy(TimeStampedModel):
    class PolicyType(models.TextChoices):
        CASH_DISCOUNT = "cash_discount", "Cash discount"
        FINANCE = "finance", "Finance"
        INSURANCE = "insurance", "Insurance"
        TRADE_IN = "trade_in", "Trade in"
        ACCESSORY = "accessory", "Accessory"

    store = models.ForeignKey("tenants.Store", on_delete=models.CASCADE, related_name="sales_policies")
    model = models.ForeignKey(VehicleModel, on_delete=models.CASCADE, related_name="sales_policies", null=True, blank=True)
    policy_type = models.CharField(max_length=32, choices=PolicyType.choices)
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_active", "-created_at"]

    def __str__(self) -> str:
        return self.title

# Create your models here.
