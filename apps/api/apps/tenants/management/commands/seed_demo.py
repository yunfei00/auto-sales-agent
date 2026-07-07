from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.customers.models import Customer, CustomerTask, DemandProfile, Interaction
from apps.leads.models import Lead, LeadSource
from apps.sales.models import Quote, TestDrive
from apps.tenants.models import Store, Tenant
from apps.vehicles.models import Brand, SalesPolicy, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim


class Command(BaseCommand):
    help = "Seed demo data for the automotive sales agent."

    def handle(self, *args, **options):
        User = get_user_model()

        tenant, _ = Tenant.objects.get_or_create(
            code="demo-auto-group",
            defaults={"name": "Demo Auto Group"},
        )
        store, _ = Store.objects.get_or_create(
            tenant=tenant,
            code="shanghai-main",
            defaults={
                "name": "Shanghai Main Store",
                "city": "Shanghai",
                "address": "No. 100 Demo Road",
                "phone": "400-100-2000",
            },
        )

        consultant, _ = User.objects.get_or_create(
            username="sales_demo",
            defaults={"first_name": "Sales", "last_name": "Demo", "email": "sales@example.com"},
        )

        web_source, _ = LeadSource.objects.get_or_create(
            code="web",
            defaults={"name": "Website"},
        )
        live_source, _ = LeadSource.objects.get_or_create(
            code="live",
            defaults={"name": "Livestream"},
        )

        brands = self._seed_vehicles(store)
        customer = self._seed_customer(tenant, store, consultant)
        self._seed_sales(customer, consultant)
        self._seed_leads(tenant, store, consultant, web_source, live_source)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo data: tenant={tenant.code}, store={store.code}, brands={len(brands)}"
            )
        )

    def _seed_vehicles(self, store):
        brand_specs = [
            {
                "brand": "Aster",
                "series": "Nova",
                "model": "Nova X",
                "trim": "Long Range Pro",
                "vin": "ASTERNOVAX000001",
                "price": Decimal("198800.00"),
                "energy_type": VehicleModel.EnergyType.BEV,
                "body_type": "SUV",
                "range_km": 620,
                "color": "Pearl White",
                "highlights": ["long_range", "family_space", "smart_drive"],
            },
            {
                "brand": "Aster",
                "series": "Nova",
                "model": "Nova X",
                "trim": "Urban Plus",
                "vin": "ASTERNOVAX000002",
                "price": Decimal("178800.00"),
                "energy_type": VehicleModel.EnergyType.BEV,
                "body_type": "SUV",
                "range_km": 520,
                "color": "Graphite Gray",
                "highlights": ["budget_friendly", "easy_parking", "low_energy_cost"],
            },
            {
                "brand": "Orion",
                "series": "Trail",
                "model": "Trail PHEV",
                "trim": "Family Max",
                "vin": "ORIONTRAIL000001",
                "price": Decimal("218800.00"),
                "energy_type": VehicleModel.EnergyType.PHEV,
                "body_type": "SUV",
                "range_km": 1100,
                "color": "Deep Blue",
                "highlights": ["no_range_anxiety", "large_trunk", "trade_in_bonus"],
            },
            {
                "brand": "Lumen",
                "series": "City",
                "model": "City E",
                "trim": "Comfort",
                "vin": "LUMENCITYE000001",
                "price": Decimal("139800.00"),
                "energy_type": VehicleModel.EnergyType.BEV,
                "body_type": "Hatchback",
                "range_km": 430,
                "color": "Mint Green",
                "highlights": ["commute", "compact", "low_price"],
            },
        ]

        brands = set()
        for spec in brand_specs:
            brand, _ = Brand.objects.get_or_create(
                code=spec["brand"].lower(),
                defaults={"name": spec["brand"], "country": "China"},
            )
            brands.add(brand.id)
            series, _ = VehicleSeries.objects.get_or_create(brand=brand, name=spec["series"])
            model, _ = VehicleModel.objects.get_or_create(
                series=series,
                name=spec["model"],
                model_year=2026,
                defaults={
                    "body_type": spec["body_type"],
                    "energy_type": spec["energy_type"],
                    "seats": 5,
                    "guide_price_min": spec["price"] - Decimal("10000.00"),
                    "guide_price_max": spec["price"] + Decimal("20000.00"),
                    "highlights": spec["highlights"],
                    "competitor_models": ["Model Y", "Song L", "M5"],
                },
            )
            trim, _ = VehicleTrim.objects.get_or_create(
                model=model,
                name=spec["trim"],
                defaults={
                    "official_price": spec["price"],
                    "range_km": spec["range_km"],
                    "configuration": {"body_type": spec["body_type"], "energy_type": spec["energy_type"]},
                },
            )
            VehicleInventory.objects.get_or_create(
                vin=spec["vin"],
                defaults={
                    "store": store,
                    "trim": trim,
                    "exterior_color": spec["color"],
                    "interior_color": "Black",
                    "status": VehicleInventory.Status.AVAILABLE,
                    "listed_price": spec["price"],
                    "negotiable_price": spec["price"] - Decimal("6000.00"),
                    "mileage_km": 12,
                },
            )
            SalesPolicy.objects.get_or_create(
                store=store,
                model=model,
                policy_type=SalesPolicy.PolicyType.CASH_DISCOUNT,
                title=f"{spec['model']} demo cash discount",
                defaults={
                    "description": "Demo policy for vehicle recommendation and quote drafting.",
                    "amount": Decimal("6000.00"),
                    "is_active": True,
                },
            )
        return brands

    def _seed_customer(self, tenant, store, consultant):
        customer, _ = Customer.objects.get_or_create(
            tenant=tenant,
            phone="13800001001",
            defaults={
                "store": store,
                "owner": consultant,
                "name": "Demo Customer",
                "wechat": "demo_customer",
                "city": "Shanghai",
                "source_label": "Website",
                "stage": Customer.Stage.QUALIFIED,
                "tags": ["high_intent", "family_use", "ev"],
                "deal_probability": 78,
                "next_action": "Invite weekend test drive",
            },
        )
        DemandProfile.objects.get_or_create(
            customer=customer,
            defaults={
                "budget_min": Decimal("180000.00"),
                "budget_max": Decimal("220000.00"),
                "energy_type": "bev",
                "body_type": "SUV",
                "seats": 5,
                "preferred_brands": ["Aster", "Orion"],
                "preferred_models": ["Nova X"],
                "usage_scenario": "family commute and weekend trips",
                "payment_preference": "finance",
                "trade_in_intent": True,
                "purchase_timeline": "within 2 weeks",
                "key_concerns": ["price", "range", "delivery_time"],
                "competitor_models": ["Model Y", "Song L"],
                "ai_summary": "High-intent family buyer with EV SUV preference and price sensitivity.",
            },
        )
        Interaction.objects.get_or_create(
            customer=customer,
            channel=Interaction.Channel.WECHAT,
            summary="Asked about EV SUV range, weekend test drive and finance plan.",
            defaults={
                "occurred_at": timezone.now(),
                "created_by": consultant,
                "ai_summary": "Focus on range confidence and monthly payment.",
            },
        )
        CustomerTask.objects.get_or_create(
            customer=customer,
            title="Invite weekend test drive",
            defaults={
                "owner": consultant,
                "task_type": "test_drive",
                "due_at": timezone.now() + timezone.timedelta(days=1),
                "priority": 1,
            },
        )
        return customer

    def _seed_sales(self, customer, consultant):
        inventory = VehicleInventory.objects.filter(status=VehicleInventory.Status.AVAILABLE).first()
        if not inventory:
            return
        TestDrive.objects.get_or_create(
            customer=customer,
            inventory=inventory,
            defaults={
                "scheduled_at": timezone.now() + timezone.timedelta(days=2),
                "consultant": consultant,
                "status": TestDrive.Status.BOOKED,
            },
        )
        Quote.objects.get_or_create(
            customer=customer,
            inventory=inventory,
            defaults={
                "consultant": consultant,
                "status": Quote.Status.DRAFT,
                "bare_vehicle_price": inventory.listed_price or Decimal("0"),
                "discount_amount": Decimal("6000.00"),
                "tax_amount": Decimal("0.00"),
                "insurance_amount": Decimal("5800.00"),
                "license_fee": Decimal("1200.00"),
                "accessory_amount": Decimal("3000.00"),
                "finance_down_payment": Decimal("60000.00"),
                "finance_monthly_payment": Decimal("3980.00"),
                "landing_price": (inventory.listed_price or Decimal("0")) - Decimal("6000.00") + Decimal("10000.00"),
                "ai_explanation": "Draft quote based on demo cash discount and finance intent.",
            },
        )

    def _seed_leads(self, tenant, store, consultant, web_source, live_source):
        lead_specs = [
            ("Mia Chen", "13900001002", "Nova X", web_source, 86),
            ("Leo Wang", "13700001003", "Trail PHEV", live_source, 72),
            ("Ivy Liu", "13600001004", "City E", web_source, 61),
        ]
        for name, phone, intent_model, source, score in lead_specs:
            Lead.objects.get_or_create(
                tenant=tenant,
                phone=phone,
                defaults={
                    "store": store,
                    "source": source,
                    "assigned_to": consultant,
                    "name": name,
                    "city": "Shanghai",
                    "intent_model": intent_model,
                    "budget_min": Decimal("150000.00"),
                    "budget_max": Decimal("230000.00"),
                    "purchase_timeline": "this month",
                    "ai_tags": ["demo", "valid_lead"],
                    "score": score,
                    "status": Lead.Status.QUALIFIED,
                },
            )
