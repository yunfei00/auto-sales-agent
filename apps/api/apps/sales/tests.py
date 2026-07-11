from decimal import Decimal
from unittest.mock import call, patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import UserProfile
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
        UserProfile.objects.create(
            user=self.user,
            tenant=tenant,
            store=self.store,
            role=UserProfile.Role.SALES_CONSULTANT,
        )
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

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_create_test_drive_assigns_consultant_and_updates_customer_stage(self, recalculate):
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
        recalculate.assert_called_once_with(
            self.customer.id,
            "test_drive_created",
            actor=self.user,
        )

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_create_quote_assigns_consultant_and_updates_customer_stage(self, recalculate):
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
        recalculate.assert_called_once_with(
            self.customer.id,
            "quote_created",
            actor=self.user,
        )

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_create_order_assigns_consultant_and_updates_customer_stage(self, recalculate):
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
        recalculate.assert_called_once_with(
            self.customer.id,
            "order_created",
            actor=self.user,
        )

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_update_test_drive_completes_stage_and_recalculates(self, recalculate):
        test_drive = TestDrive.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            scheduled_at=timezone.now() - timezone.timedelta(hours=1),
            status=TestDrive.Status.BOOKED,
        )

        response = self.client.patch(
            f"/api/sales/test-drives/{test_drive.id}/",
            {"status": TestDrive.Status.COMPLETED},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.TEST_DRIVEN)
        self.assertEqual(self.customer.next_action, "试驾后回访并确认报价意向")
        recalculate.assert_called_once_with(
            self.customer.id,
            "test_drive_updated",
            actor=self.user,
        )

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_update_quote_recalculates_and_keeps_quoted_stage(self, recalculate):
        quote = Quote.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            status=Quote.Status.DRAFT,
            bare_vehicle_price=Decimal("192800.00"),
            landing_price=Decimal("196800.00"),
        )

        response = self.client.patch(
            f"/api/sales/quotes/{quote.id}/",
            {"status": Quote.Status.SENT},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.QUOTED)
        recalculate.assert_called_once_with(
            self.customer.id,
            "quote_updated",
            actor=self.user,
        )

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_update_order_advances_deposit_contract_and_delivery_stages(self, recalculate):
        order = Order.objects.create(
            order_number="AS202607070002",
            customer=self.customer,
            inventory=self.inventory,
            status=Order.Status.DRAFT,
            total_amount=Decimal("196800.00"),
        )

        expected_stages = (
            (Order.Status.DEPOSIT_PAID, Customer.Stage.DEPOSIT_PAID),
            (Order.Status.CONTRACT_SIGNED, Customer.Stage.CONTRACT_SIGNED),
            (Order.Status.DELIVERED, Customer.Stage.DELIVERED),
        )
        for status, expected_stage in expected_stages:
            response = self.client.patch(
                f"/api/sales/orders/{order.id}/",
                {"status": status},
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 200)
            self.customer.refresh_from_db()
            self.assertEqual(self.customer.stage, expected_stage)

        recalculate.assert_has_calls(
            [
                call(self.customer.id, "order_updated", actor=self.user),
                call(self.customer.id, "order_updated", actor=self.user),
                call(self.customer.id, "order_updated", actor=self.user),
            ]
        )
        self.assertEqual(recalculate.call_count, 3)

    @patch("apps.sales.views.recalculate_customer_level_safely")
    def test_draft_and_cancelled_order_do_not_close_customer(self, recalculate):
        response = self.client.post(
            "/api/sales/orders/",
            {
                "order_number": "AS202607070003",
                "customer": self.customer.id,
                "inventory": self.inventory.id,
                "status": Order.Status.DRAFT,
                "total_amount": "196800.00",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        order_id = response.json()["id"]
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.QUALIFIED)
        self.assertNotEqual(self.customer.level_status, "closed")

        response = self.client.patch(
            f"/api/sales/orders/{order_id}/",
            {"status": Order.Status.CANCELLED},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.customer.refresh_from_db()
        self.assertEqual(self.customer.stage, Customer.Stage.QUALIFIED)
        self.assertNotEqual(self.customer.level_status, "closed")
        recalculate.assert_has_calls(
            [
                call(self.customer.id, "order_created", actor=self.user),
                call(self.customer.id, "order_updated", actor=self.user),
            ]
        )

    def test_quote_write_rejects_inventory_from_another_tenant(self):
        other_tenant = Tenant.objects.create(name="其他集团", code="other-sales")
        other_store = Store.objects.create(
            tenant=other_tenant,
            name="其他门店",
            code="other-store",
        )
        other_inventory = VehicleInventory.objects.create(
            store=other_store,
            trim=self.inventory.trim,
            vin="OTHERTESTVIN00001",
            listed_price=Decimal("198800.00"),
        )

        response = self.client.post(
            "/api/sales/quotes/",
            {
                "customer": self.customer.id,
                "inventory": other_inventory.id,
                "status": Quote.Status.SENT,
                "landing_price": "198800.00",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("inventory", response.json())
        self.assertFalse(Quote.objects.filter(customer=self.customer, inventory=other_inventory).exists())

    def test_status_transitions_set_read_only_scoring_timestamps(self):
        timestamp = timezone.now()
        forged_timestamp = (timestamp - timezone.timedelta(days=30)).isoformat()
        test_drive = TestDrive.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            scheduled_at=timestamp,
            status=TestDrive.Status.BOOKED,
        )
        quote = Quote.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            status=Quote.Status.DRAFT,
            landing_price=Decimal("196800.00"),
        )

        with patch("apps.sales.views.timezone.now", return_value=timestamp):
            drive_response = self.client.patch(
                f"/api/sales/test-drives/{test_drive.id}/",
                {"status": TestDrive.Status.COMPLETED, "completed_at": forged_timestamp},
                content_type="application/json",
            )
            quote_response = self.client.patch(
                f"/api/sales/quotes/{quote.id}/",
                {"status": Quote.Status.SENT, "sent_at": forged_timestamp},
                content_type="application/json",
            )

        self.assertEqual(drive_response.status_code, 200)
        self.assertEqual(quote_response.status_code, 200)
        test_drive.refresh_from_db()
        quote.refresh_from_db()
        self.assertEqual(test_drive.completed_at, timestamp)
        self.assertEqual(quote.sent_at, timestamp)
