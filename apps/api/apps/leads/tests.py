from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings

from apps.accounts.models import UserProfile
from apps.tenants.models import Store, Tenant

from .models import Lead, LeadImportJob


class LeadCaptureTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="admin", password="Passw0rd!234")
        self.client.login(username="admin", password="Passw0rd!234")
        self.tenant = Tenant.objects.create(name="Demo Group", code="lead-demo")
        self.store = Store.objects.create(tenant=self.tenant, name="Shanghai Store", code="lead-sh", city="Shanghai")
        UserProfile.objects.create(
            user=self.user,
            tenant=self.tenant,
            store=self.store,
            role=UserProfile.Role.SALES_CONSULTANT,
        )

    def test_manual_lead_create_uses_default_tenant_store_and_source(self):
        response = self.client.post(
            "/api/leads/",
            {
                "name": "Manual Customer",
                "phone": "13900002001",
                "city": "Shanghai",
                "intent_model": "Nova X",
                "score": 81,
                "status": Lead.Status.QUALIFIED,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        lead = Lead.objects.get(phone="13900002001")
        self.assertEqual(lead.tenant, self.tenant)
        self.assertEqual(lead.store, self.store)
        self.assertEqual(lead.source.code, "manual")
        self.assertEqual(lead.assigned_to, self.user)

    def test_csv_import_creates_leads_and_records_job_counts(self):
        uploaded = SimpleUploadedFile(
            "leads.csv",
            "name,phone,city,intent_model,budget_min,budget_max,purchase_timeline,score,notes\n"
            "Imported Customer,13900002002,Shanghai,Nova X,180000,230000,this month,88,weekend test drive\n".encode(),
            content_type="text/csv",
        )

        response = self.client.post("/api/leads/imports/", {"file": uploaded})

        self.assertEqual(response.status_code, 201)
        job = LeadImportJob.objects.get(id=response.json()["id"])
        self.assertEqual(job.status, LeadImportJob.Status.COMPLETED)
        self.assertEqual(job.total_rows, 1)
        self.assertEqual(job.imported_rows, 1)
        lead = Lead.objects.get(phone="13900002002")
        self.assertEqual(lead.name, "Imported Customer")
        self.assertEqual(lead.budget_min, 180000)
        self.assertEqual(lead.budget_max, 230000)
        self.assertEqual(lead.source.code, "csv")

    def test_lead_list_is_limited_to_user_tenant(self):
        other_tenant = Tenant.objects.create(name="Other Group", code="other-tenant")
        own_lead = Lead.objects.create(
            tenant=self.tenant,
            store=self.store,
            name="Own customer",
            phone="13900003001",
        )
        Lead.objects.create(
            tenant=other_tenant,
            name="Other customer",
            phone="13900003002",
        )

        response = self.client.get("/api/leads/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], own_lead.id)

    def test_csv_import_rejects_non_csv_file(self):
        uploaded = SimpleUploadedFile(
            "leads.exe",
            b"not a csv",
            content_type="application/octet-stream",
        )

        response = self.client.post("/api/leads/imports/", {"file": uploaded})

        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.json())

    @override_settings(MAX_CSV_IMPORT_BYTES=8)
    def test_csv_import_rejects_oversized_file(self):
        uploaded = SimpleUploadedFile(
            "leads.csv",
            b"name,phone\nalice,13900009999\n",
            content_type="text/csv",
        )

        response = self.client.post("/api/leads/imports/", {"file": uploaded})

        self.assertEqual(response.status_code, 400)
        self.assertIn("file", response.json())
