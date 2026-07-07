import os
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.customers.models import Customer, CustomerTask, DemandProfile, Interaction
from apps.accounts.models import UserProfile
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
            defaults={"name": "演示汽车集团"},
        )
        self._update_fields(tenant, {"name": "演示汽车集团"})
        store, _ = Store.objects.get_or_create(
            tenant=tenant,
            code="shanghai-main",
            defaults={
                "name": "上海主门店",
                "city": "上海",
                "address": "演示路 100 号",
                "phone": "400-100-2000",
            },
        )
        self._update_fields(
            store,
            {
                "name": "上海主门店",
                "city": "上海",
                "address": "演示路 100 号",
            },
        )

        consultant, _ = User.objects.get_or_create(
            username="sales_demo",
            defaults={"first_name": "演示", "last_name": "销售", "email": "sales@example.com"},
        )
        self._update_fields(consultant, {"first_name": "演示", "last_name": "销售"})
        demo_password = os.getenv("SALES_DEMO_PASSWORD")
        if demo_password:
            consultant.set_password(demo_password)
            consultant.save(update_fields=["password"])
        UserProfile.objects.get_or_create(
            user=consultant,
            defaults={"tenant": tenant, "store": store, "role": UserProfile.Role.SALES_CONSULTANT},
        )

        web_source, _ = LeadSource.objects.get_or_create(
            code="web",
            defaults={"name": "官网"},
        )
        self._update_fields(web_source, {"name": "官网"})
        live_source, _ = LeadSource.objects.get_or_create(
            code="live",
            defaults={"name": "直播"},
        )
        self._update_fields(live_source, {"name": "直播"})

        brands = self._seed_vehicles(store)
        customer = self._seed_customer(tenant, store, consultant)
        self._seed_sales(customer, consultant)
        self._seed_leads(tenant, store, consultant, web_source, live_source, customer)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded demo data: tenant={tenant.code}, store={store.code}, brands={len(brands)}"
            )
        )

    def _update_fields(self, instance, updates):
        dirty_fields = []
        for field, value in updates.items():
            if getattr(instance, field) != value:
                setattr(instance, field, value)
                dirty_fields.append(field)
        if dirty_fields:
            instance.save(update_fields=dirty_fields)

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
                "color": "珍珠白",
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
                "color": "石墨灰",
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
                "color": "深海蓝",
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
                "color": "薄荷绿",
                "highlights": ["commute", "compact", "low_price"],
            },
        ]

        brands = set()
        for spec in brand_specs:
            brand, _ = Brand.objects.get_or_create(
                code=spec["brand"].lower(),
                defaults={"name": spec["brand"], "country": "中国"},
            )
            self._update_fields(brand, {"country": "中国"})
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
            inventory, _ = VehicleInventory.objects.get_or_create(
                vin=spec["vin"],
                defaults={
                    "store": store,
                    "trim": trim,
                    "exterior_color": spec["color"],
                    "interior_color": "黑色",
                    "status": VehicleInventory.Status.AVAILABLE,
                    "listed_price": spec["price"],
                    "negotiable_price": spec["price"] - Decimal("6000.00"),
                    "mileage_km": 12,
                },
            )
            self._update_fields(
                inventory,
                {
                    "exterior_color": spec["color"],
                    "interior_color": "黑色",
                },
            )
            old_policy_title = f"{spec['model']} demo cash discount"
            policy_title = f"{spec['model']} 演示现金优惠"
            SalesPolicy.objects.filter(
                store=store,
                model=model,
                policy_type=SalesPolicy.PolicyType.CASH_DISCOUNT,
                title=old_policy_title,
            ).update(title=policy_title, description="用于车型推荐和报价草案的演示销售政策。")
            SalesPolicy.objects.update_or_create(
                store=store,
                model=model,
                policy_type=SalesPolicy.PolicyType.CASH_DISCOUNT,
                title=policy_title,
                defaults={
                    "description": "用于车型推荐和报价草案的演示销售政策。",
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
                "name": "演示客户",
                "wechat": "demo_customer",
                "city": "上海",
                "source_label": "官网",
                "stage": Customer.Stage.QUALIFIED,
                "tags": ["high_intent", "family_use", "ev"],
                "deal_probability": 78,
                "next_action": "邀约周末试驾",
            },
        )
        self._update_fields(
            customer,
            {
                "store": store,
                "owner": consultant,
                "name": "演示客户",
                "city": "上海",
                "source_label": "官网",
                "next_action": "邀约周末试驾",
            },
        )
        demand_profile, _ = DemandProfile.objects.get_or_create(
            customer=customer,
            defaults={
                "budget_min": Decimal("180000.00"),
                "budget_max": Decimal("220000.00"),
                "energy_type": "bev",
                "body_type": "SUV",
                "seats": 5,
                "preferred_brands": ["Aster", "Orion"],
                "preferred_models": ["Nova X"],
                "usage_scenario": "家庭通勤与周末出行",
                "payment_preference": "finance",
                "trade_in_intent": True,
                "purchase_timeline": "两周内",
                "key_concerns": ["价格", "续航", "交付时间"],
                "competitor_models": ["Model Y", "Song L"],
                "ai_summary": "高意向家庭用户，偏好新能源 SUV，对价格和成交政策较敏感。",
            },
        )
        self._update_fields(
            demand_profile,
            {
                "usage_scenario": "家庭通勤与周末出行",
                "purchase_timeline": "两周内",
                "key_concerns": ["价格", "续航", "交付时间"],
                "ai_summary": "高意向家庭用户，偏好新能源 SUV，对价格和成交政策较敏感。",
            },
        )
        Interaction.objects.filter(
            customer=customer,
            channel=Interaction.Channel.WECHAT,
            summary="Asked about EV SUV range, weekend test drive and finance plan.",
        ).update(
            summary="咨询新能源 SUV 续航、周末试驾和金融方案。",
            ai_summary="重点跟进续航信心和月供方案。",
        )
        Interaction.objects.get_or_create(
            customer=customer,
            channel=Interaction.Channel.WECHAT,
            summary="咨询新能源 SUV 续航、周末试驾和金融方案。",
            defaults={
                "occurred_at": timezone.now(),
                "created_by": consultant,
                "ai_summary": "重点跟进续航信心和月供方案。",
            },
        )
        CustomerTask.objects.filter(customer=customer, title="Invite weekend test drive").update(title="邀约周末试驾")
        CustomerTask.objects.get_or_create(
            customer=customer,
            title="邀约周末试驾",
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
        quote, _ = Quote.objects.get_or_create(
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
                "ai_explanation": "基于演示现金优惠和金融意向生成的报价草案。",
            },
        )
        self._update_fields(
            quote,
            {
                "ai_explanation": "基于演示现金优惠和金融意向生成的报价草案。",
            },
        )

    def _seed_leads(self, tenant, store, consultant, web_source, live_source, customer):
        lead_specs = [
            ("演示客户", "13800001001", "Nova X", web_source, 90, customer),
            ("陈米娅", "13900001002", "Nova X", web_source, 86, None),
            ("王立欧", "13700001003", "Trail PHEV", live_source, 72, None),
            ("刘艾薇", "13600001004", "City E", web_source, 61, None),
        ]
        for name, phone, intent_model, source, score, linked_customer in lead_specs:
            lead, _ = Lead.objects.get_or_create(
                tenant=tenant,
                phone=phone,
                defaults={
                    "store": store,
                    "source": source,
                    "assigned_to": consultant,
                    "name": name,
                    "city": "上海",
                    "intent_model": intent_model,
                    "budget_min": Decimal("150000.00"),
                    "budget_max": Decimal("230000.00"),
                    "purchase_timeline": "本月",
                    "ai_tags": ["demo", "valid_lead"],
                    "score": score,
                    "status": Lead.Status.QUALIFIED,
                    "customer": linked_customer,
                },
            )
            self._update_fields(
                lead,
                {
                    "store": store,
                    "source": source,
                    "assigned_to": consultant,
                    "name": name,
                    "city": "上海",
                    "purchase_timeline": "本月",
                    "score": score,
                    "status": Lead.Status.QUALIFIED,
                    "customer": linked_customer,
                },
            )
