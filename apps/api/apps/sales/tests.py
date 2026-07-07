from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.customers.models import Customer
from apps.tenants.models import Store, Tenant
from apps.vehicles.models import Brand, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim

from .models import Order, Quote, TestDrive


class SalesWorkflowApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="sales", password="Passw0rd!234")
        self.client.login(username="sales", password="Passw0rd!234")
        tenant = Tenant.objects.create(name="演示集团", code="demo")
        self.store = Store.objects.create(tenant=tenant, name="上海门店", code="sh", city="上海")
        self.customer = Customer.objects.create(
            tenant=tenant,
            store=self.store,
            name="演示客户",
            phone="13800000000",
            stage=Customer.Stage.QUALIFIED,
        )
        brand = Brand.objects.create(name="Aster", code="aster")
        series = VehicleSeries.objects.create(brand=brand, name="Nova")
        model = VehicleModel.objects.create(
            series=series,
            name="Nova X",
            model_year=2026,
            body_type="SUV",
            energy_type=VehicleModel.EnergyType.BEV,
        )
        trim = VehicleTrim.objects.create(model=model, name="Long Range", official_price=Decimal("198800.00"))
        self.inventory = VehicleInventory.objects.create(
            store=self.store,
            trim=trim,
            vin="TESTVIN000000001",
            listed_price=Decimal("198800.00"),
            negotiable_price=Decimal("192800.00"),
        )

    def test_create_test_drive_assigns_consultant_and_updates_customer_stage(self):
        scheduled_at = timezone.now() + timezone.timedelta(days=1)

        response = self.client.post(
            "/api/sales/test-drives/",
            {
                "customer": self.customer.id,
                "inventory": self.inventory.id,
                "scheduled_at": scheduled_at.isoformat(),
                "status": TestDrive.Status.BOOKED,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        test_drive = TestDrive.objects.get(id=response.json()["id"])
        self.assertEqual(test_drive.consultant, self.user)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.TEST_DRIVE_BOOKED)
        self.assertEqual(self.customer.next_action, "试驾前确认到店时间")

    def test_create_quote_assigns_consultant_and_updates_customer_stage(self):
        response = self.client.post(
            "/api/sales/quotes/",
            {
                "customer": self.customer.id,
                "inventory": self.inventory.id,
                "status": Quote.Status.DRAFT,
                "bare_vehicle_price": "192800.00",
                "discount_amount": "6000.00",
                "tax_amount": "0.00",
                "insurance_amount": "5800.00",
                "license_fee": "1200.00",
                "accessory_amount": "3000.00",
                "finance_down_payment": "57840.00",
                "finance_monthly_payment": "3753.33",
                "landing_price": "196800.00",
                "ai_explanation": "该报价为草案，最终成交价需门店确认。",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        quote = Quote.objects.get(id=response.json()["id"])
        self.assertEqual(quote.consultant, self.user)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.QUOTED)
        self.assertEqual(self.customer.next_action, "发送报价并确认订金意向")

    def test_create_order_assigns_consultant_and_updates_customer_stage(self):
        quote = Quote.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            bare_vehicle_price=Decimal("192800.00"),
            landing_price=Decimal("196800.00"),
        )

        response = self.client.post(
            "/api/sales/orders/",
            {
                "order_number": "AS202607070001",
                "customer": self.customer.id,
                "quote": quote.id,
                "inventory": self.inventory.id,
                "status": Order.Status.DEPOSIT_PAID,
                "deposit_amount": "10000.00",
                "paid_amount": "10000.00",
                "total_amount": "196800.00",
                "expected_delivery_date": "2026-07-14",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        order = Order.objects.get(id=response.json()["id"])
        self.assertEqual(order.consultant, self.user)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.DEPOSIT_PAID)
        self.assertEqual(self.customer.next_action, "推进合同签署和交付准备")
