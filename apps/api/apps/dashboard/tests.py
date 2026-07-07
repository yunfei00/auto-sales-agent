from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import UserProfile
from apps.customers.models import Customer, CustomerTask
from apps.leads.models import Lead
from apps.sales.models import Quote, TestDrive
from apps.tenants.models import Store, Tenant
from apps.vehicles.models import Brand, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim


class DashboardSummaryTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="dashboard", password="Passw0rd!234")
        self.client.login(username="dashboard", password="Passw0rd!234")
        tenant = Tenant.objects.create(name="Demo Group", code="demo-dashboard")
        store = Store.objects.create(tenant=tenant, name="Shanghai Store", code="dashboard-sh", city="Shanghai")
        UserProfile.objects.create(
            user=self.user,
            tenant=tenant,
            store=store,
            role=UserProfile.Role.SALES_MANAGER,
        )
        self.customer = Customer.objects.create(
            tenant=tenant,
            store=store,
            name="Demo Customer",
            phone="13800000001",
            stage=Customer.Stage.QUOTED,
        )
        brand = Brand.objects.create(name="Aster", code="dashboard-aster")
        series = VehicleSeries.objects.create(brand=brand, name="Nova")
        model = VehicleModel.objects.create(series=series, name="Nova X", model_year=2026)
        trim = VehicleTrim.objects.create(model=model, name="Pro", official_price=Decimal("198800.00"))
        self.inventory = VehicleInventory.objects.create(
            store=store,
            trim=trim,
            vin="DASHBOARDVIN00001",
            listed_price=Decimal("198800.00"),
        )
        Lead.objects.create(tenant=tenant, store=store, name="High Intent Customer", phone="13900000001", score=88)
        CustomerTask.objects.create(
            customer=self.customer,
            title="Follow up customer",
            due_at=timezone.now() - timezone.timedelta(hours=1),
            status=CustomerTask.Status.OPEN,
        )
        Quote.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            bare_vehicle_price=Decimal("198800.00"),
            landing_price=Decimal("202800.00"),
        )
        TestDrive.objects.create(
            customer=self.customer,
            inventory=self.inventory,
            scheduled_at=timezone.now() + timezone.timedelta(hours=2),
            status=TestDrive.Status.BOOKED,
        )

    def test_summary_counts_operational_metrics(self):
        response = self.client.get("/api/dashboard/summary/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["leads"]["high_intent"], 1)
        self.assertEqual(payload["customers"]["quoted"], 1)
        self.assertEqual(payload["tasks"]["open"], 1)
        self.assertEqual(payload["tasks"]["overdue"], 1)
        self.assertEqual(payload["sales"]["quotes"], 1)
        self.assertEqual(payload["sales"]["quote_pipeline"], "202800.00")
        self.assertEqual(payload["sales"]["test_drives_booked"], 1)
        self.assertEqual(payload["inventory"]["available"], 1)
