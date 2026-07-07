from django.core.management import call_command
from django.test import TestCase

from apps.customers.models import Customer
from apps.sales.models import Quote, TestDrive
from apps.vehicles.models import VehicleInventory


class SeedDemoTests(TestCase):
    def test_seed_demo_tolerates_existing_duplicate_sales_records(self):
        call_command("seed_demo")
        customer = Customer.objects.get(phone="13800001001")
        inventory = VehicleInventory.objects.filter(status=VehicleInventory.Status.AVAILABLE).first()
        self.assertIsNotNone(inventory)

        TestDrive.objects.create(
            customer=customer,
            inventory=inventory,
            scheduled_at=TestDrive.objects.filter(customer=customer, inventory=inventory).first().scheduled_at,
            status=TestDrive.Status.BOOKED,
        )
        Quote.objects.create(
            customer=customer,
            inventory=inventory,
            landing_price="188800.00",
            ai_explanation="重复报价记录",
        )

        call_command("seed_demo")

        self.assertGreaterEqual(TestDrive.objects.filter(customer=customer, inventory=inventory).count(), 2)
        self.assertGreaterEqual(Quote.objects.filter(customer=customer, inventory=inventory).count(), 2)
