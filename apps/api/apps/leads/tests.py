from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase

from apps.tenants.models import Store, Tenant

from .models import Lead, LeadImportJob


class LeadCaptureTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="admin", password="Passw0rd!234")
        self.client.login(username="admin", password="Passw0rd!234")
        self.tenant = Tenant.objects.create(name="演示集团", code="lead-demo")
        self.store = Store.objects.create(tenant=self.tenant, name="上海门店", code="lead-sh", city="上海")

    def test_manual_lead_create_uses_default_tenant_store_and_source(self):
        response = self.client.post(
            "/api/leads/",
            {
                "name": "手工客户",
                "phone": "13900002001",
                "city": "上海",
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
            "姓名,手机号,城市,意向车型,预算下限,预算上限,购车周期,评分,备注\n"
            "导入客户,13900002002,上海,Nova X,18万,23万,本月,88,周末可试驾\n".encode("utf-8-sig"),
            content_type="text/csv",
        )

        response = self.client.post("/api/leads/imports/", {"file": uploaded})

        self.assertEqual(response.status_code, 201)
        job = LeadImportJob.objects.get(id=response.json()["id"])
        self.assertEqual(job.status, LeadImportJob.Status.COMPLETED)
        self.assertEqual(job.total_rows, 1)
        self.assertEqual(job.imported_rows, 1)
        lead = Lead.objects.get(phone="13900002002")
        self.assertEqual(lead.name, "导入客户")
        self.assertEqual(lead.budget_min, 180000)
        self.assertEqual(lead.budget_max, 230000)
        self.assertEqual(lead.source.code, "csv")
