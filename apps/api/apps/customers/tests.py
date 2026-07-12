from datetime import datetime, timedelta
from decimal import Decimal
from io import StringIO
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from apps.accounts.models import UserProfile
from apps.sales.models import Order, Quote, TestDrive
from apps.tenants.models import Store, Tenant
from apps.vehicles.models import Brand, VehicleInventory, VehicleModel, VehicleSeries, VehicleTrim

from .models import Customer, CustomerLevelHistory, DemandProfile, Interaction
from .services.customer_scoring import (
    calculate_customer_score,
    map_score_to_level,
    recalculate_customer_level,
)


FIXED_NOW = datetime(2026, 7, 11, 12, 0, tzinfo=ZoneInfo("Asia/Shanghai"))
SCORING_NOW_PATCH = "apps.customers.services.customer_scoring.timezone.now"


class CustomerScoringTestMixin:
    def setUp(self):
        super().setUp()
        self.user = get_user_model().objects.create_user(username="scoring-user")
        self.tenant = Tenant.objects.create(name="Scoring Group", code="scoring")
        self.store = Store.objects.create(
            tenant=self.tenant,
            name="Scoring Store",
            code="scoring-store",
            city="Shanghai",
        )
        UserProfile.objects.create(
            user=self.user,
            tenant=self.tenant,
            store=self.store,
            role=UserProfile.Role.SALES_CONSULTANT,
        )
        self.client.force_login(self.user)
        self._customer_sequence = 0

    def make_customer(self, **overrides):
        self._customer_sequence += 1
        defaults = {
            "tenant": self.tenant,
            "store": self.store,
            "owner": self.user,
            "name": f"Scoring Customer {self._customer_sequence}",
            "phone": f"1381000{self._customer_sequence:04d}",
            "city": "Shanghai",
            "stage": Customer.Stage.CONTACTED,
            "next_action": "Confirm next sales step",
        }
        defaults.update(overrides)
        return Customer.objects.create(**defaults)

    def make_demand_profile(self, customer, **overrides):
        defaults = {
            "customer": customer,
            "budget_min": Decimal("180000.00"),
            "budget_max": Decimal("220000.00"),
            "energy_type": "bev",
            "body_type": "SUV",
            "seats": 5,
            "preferred_brands": ["Aster"],
            "preferred_models": ["Nova X"],
            "usage_scenario": "Family travel",
            "payment_preference": "finance",
            "trade_in_intent": True,
            "purchase_timeline_bucket": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
            "key_concerns": ["price", "range"],
            "competitor_models": ["Competitor X"],
        }
        defaults.update(overrides)
        return DemandProfile.objects.create(**defaults)

    def make_interaction(self, customer, *, occurred_at=None, **overrides):
        defaults = {
            "customer": customer,
            "channel": Interaction.Channel.PHONE,
            "occurred_at": occurred_at or FIXED_NOW - timedelta(hours=2),
            "summary": "Customer confirmed the next follow-up step.",
            "created_by": self.user,
        }
        defaults.update(overrides)
        return Interaction.objects.create(**defaults)

    def make_quote(self, customer, *, created_at, **overrides):
        defaults = {
            "customer": customer,
            "status": Quote.Status.SENT,
            "bare_vehicle_price": Decimal("190000.00"),
            "landing_price": Decimal("198000.00"),
            "sent_at": created_at,
        }
        defaults.update(overrides)
        quote = Quote.objects.create(**defaults)
        Quote.objects.filter(pk=quote.pk).update(created_at=created_at, updated_at=created_at)
        quote.refresh_from_db()
        return quote

    def make_inventory(self):
        brand = Brand.objects.create(name="Scoring Brand", code="scoring-brand")
        series = VehicleSeries.objects.create(brand=brand, name="Scoring Series")
        model = VehicleModel.objects.create(
            series=series,
            name="Scoring Model",
            model_year=2026,
        )
        trim = VehicleTrim.objects.create(
            model=model,
            name="Scoring Trim",
            official_price=Decimal("198000.00"),
        )
        return VehicleInventory.objects.create(
            store=self.store,
            trim=trim,
            vin="SCORINGVIN0000001",
            listed_price=Decimal("198000.00"),
        )


class CustomerScoringCalculationTests(CustomerScoringTestMixin, TestCase):
    def test_new_lead_with_insufficient_information_is_pending_n(self):
        customer = self.make_customer(
            stage=Customer.Stage.NEW_LEAD,
            city="",
            next_action="",
        )

        result = calculate_customer_score(customer, now=FIXED_NOW)

        self.assertEqual(result["customer_level"], Customer.Level.N)
        self.assertEqual(result["customer_score"], 0)
        self.assertEqual(result["level_status"], Customer.LevelStatus.PENDING)
        self.assertTrue(result["score_breakdown"]["missing_data"])

        persisted = recalculate_customer_level(
            customer.id,
            trigger="test_new_lead",
            actor=self.user,
            now=FIXED_NOW,
        )
        customer.refresh_from_db()
        self.assertEqual(persisted["customer_level"], Customer.Level.N)
        self.assertEqual(customer.customer_level, Customer.Level.N)
        self.assertEqual(customer.level_status, Customer.LevelStatus.PENDING)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_score_boundaries_map_to_expected_levels(self):
        cases = {
            0: Customer.Level.D,
            24: Customer.Level.D,
            25: Customer.Level.C,
            49: Customer.Level.C,
            50: Customer.Level.B,
            69: Customer.Level.B,
            70: Customer.Level.A,
            84: Customer.Level.A,
            85: Customer.Level.A_PLUS,
            100: Customer.Level.A_PLUS,
        }

        for score, expected_level in cases.items():
            with self.subTest(score=score):
                self.assertEqual(map_score_to_level(score), expected_level)

    def test_purchase_within_seven_days_scores_higher_than_over_ninety_days(self):
        urgent = self.make_customer()
        distant = self.make_customer()
        self.make_demand_profile(
            urgent,
            purchase_timeline_bucket=DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
        )
        self.make_demand_profile(
            distant,
            purchase_timeline_bucket=DemandProfile.PurchaseTimeline.OVER_90_DAYS,
        )
        self.make_interaction(urgent)
        self.make_interaction(distant)

        urgent_result = calculate_customer_score(urgent, now=FIXED_NOW)
        distant_result = calculate_customer_score(distant, now=FIXED_NOW)

        self.assertGreater(
            urgent_result["score_breakdown"]["dimensions"]["purchase_timing"]["score"],
            distant_result["score_breakdown"]["dimensions"]["purchase_timing"]["score"],
        )
        self.assertGreater(urgent_result["customer_score"], distant_result["customer_score"])

    def test_completed_test_drive_scores_higher_than_first_contact(self):
        contacted = self.make_customer(stage=Customer.Stage.CONTACTED)
        test_driven = self.make_customer(stage=Customer.Stage.TEST_DRIVEN)
        self.make_demand_profile(contacted)
        self.make_demand_profile(test_driven)
        self.make_interaction(contacted)
        self.make_interaction(test_driven)
        TestDrive.objects.create(
            customer=test_driven,
            scheduled_at=FIXED_NOW - timedelta(days=1),
            status=TestDrive.Status.COMPLETED,
        )

        contacted_result = calculate_customer_score(contacted, now=FIXED_NOW)
        test_driven_result = calculate_customer_score(test_driven, now=FIXED_NOW)

        self.assertGreater(
            test_driven_result["score_breakdown"]["dimensions"]["sales_progress"]["score"],
            contacted_result["score_breakdown"]["dimensions"]["sales_progress"]["score"],
        )
        self.assertGreater(test_driven_result["customer_score"], contacted_result["customer_score"])

    def test_recent_interaction_scores_higher_than_interaction_older_than_fourteen_days(self):
        recent = self.make_customer()
        stale = self.make_customer()
        self.make_demand_profile(recent)
        self.make_demand_profile(stale)
        self.make_interaction(recent, occurred_at=FIXED_NOW - timedelta(hours=23))
        self.make_interaction(stale, occurred_at=FIXED_NOW - timedelta(days=15))

        recent_result = calculate_customer_score(recent, now=FIXED_NOW)
        stale_result = calculate_customer_score(stale, now=FIXED_NOW)

        self.assertGreater(
            recent_result["score_breakdown"]["dimensions"]["interaction_activity"]["score"],
            stale_result["score_breakdown"]["dimensions"]["interaction_activity"]["score"],
        )
        self.assertGreater(recent_result["customer_score"], stale_result["customer_score"])

    def test_quote_without_feedback_for_more_than_seven_days_adds_risk_deduction(self):
        recent_quote_customer = self.make_customer(stage=Customer.Stage.QUOTED)
        stale_quote_customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(recent_quote_customer)
        self.make_demand_profile(stale_quote_customer)
        interaction_time = FIXED_NOW - timedelta(days=10)
        self.make_interaction(recent_quote_customer, occurred_at=interaction_time)
        self.make_interaction(stale_quote_customer, occurred_at=interaction_time)
        self.make_quote(recent_quote_customer, created_at=FIXED_NOW - timedelta(days=1))
        self.make_quote(stale_quote_customer, created_at=FIXED_NOW - timedelta(days=8))

        recent_result = calculate_customer_score(recent_quote_customer, now=FIXED_NOW)
        stale_result = calculate_customer_score(stale_quote_customer, now=FIXED_NOW)

        self.assertGreater(
            stale_result["score_breakdown"]["risk"]["applied_deduction"],
            recent_result["score_breakdown"]["risk"]["applied_deduction"],
        )
        self.assertLess(stale_result["customer_score"], recent_result["customer_score"])

    def test_risk_deduction_keeps_reason_and_caps_the_applied_total(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_interaction(customer, occurred_at=FIXED_NOW - timedelta(days=12))
        self.make_quote(customer, created_at=FIXED_NOW - timedelta(days=8))
        TestDrive.objects.create(
            customer=customer,
            scheduled_at=FIXED_NOW - timedelta(days=10),
            completed_at=FIXED_NOW - timedelta(days=10),
            status=TestDrive.Status.COMPLETED,
        )
        patched_deductions = {
            "quote_no_feedback_over_7_days": 15,
            "test_drive_no_interaction_over_5_days": 14,
        }

        with patch.dict(
            "apps.customers.services.customer_scoring.RISK_DEDUCTIONS",
            patched_deductions,
            clear=True,
        ):
            result = calculate_customer_score(customer, now=FIXED_NOW)

        risk = result["score_breakdown"]["risk"]
        self.assertEqual(risk["raw_deduction"], 29)
        self.assertEqual(risk["applied_deduction"], 20)
        self.assertEqual(risk["max_deduction"], 20)
        self.assertCountEqual(
            [reason["code"] for reason in risk["reasons"]],
            patched_deductions,
        )
        self.assertEqual(
            result["customer_score"],
            max(0, result["score_breakdown"]["base_score"] - 20),
        )

    def test_unsent_quote_and_missing_test_drive_completion_time_do_not_create_risk(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_quote(
            customer,
            created_at=FIXED_NOW - timedelta(days=10),
            status=Quote.Status.DRAFT,
            sent_at=None,
        )
        TestDrive.objects.create(
            customer=customer,
            scheduled_at=FIXED_NOW - timedelta(days=10),
            completed_at=None,
            status=TestDrive.Status.COMPLETED,
        )

        risk = calculate_customer_score(customer, now=FIXED_NOW)["score_breakdown"]["risk"]

        self.assertEqual(risk["applied_deduction"], 0)
        self.assertIn("test_drive_completed_at", risk["missing_data"])

    def test_newer_quote_feedback_prevents_penalizing_an_older_sent_quote(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_quote(customer, created_at=FIXED_NOW - timedelta(days=10))
        self.make_quote(
            customer,
            created_at=FIXED_NOW - timedelta(days=1),
            status=Quote.Status.ACCEPTED,
            sent_at=FIXED_NOW - timedelta(days=1),
        )

        risk = calculate_customer_score(customer, now=FIXED_NOW)["score_breakdown"]["risk"]

        self.assertEqual(risk["applied_deduction"], 0)

    def test_missing_fields_are_reported_without_raising(self):
        customer = self.make_customer(city="", next_action="")

        result = calculate_customer_score(customer, now=FIXED_NOW)

        self.assertIsInstance(result, dict)
        self.assertTrue(result["score_breakdown"]["missing_data"])
        self.assertGreaterEqual(result["customer_score"], 0)
        self.assertLessEqual(result["customer_score"], 100)

    def test_total_score_is_clamped_between_zero_and_one_hundred(self):
        high_score_customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(high_score_customer)
        self.make_interaction(high_score_customer)
        self.make_quote(high_score_customer, created_at=FIXED_NOW - timedelta(days=1))

        low_score_customer = self.make_customer(stage=Customer.Stage.CONTACTED)
        self.make_demand_profile(
            low_score_customer,
            budget_min=None,
            budget_max=None,
            energy_type="",
            body_type="",
            seats=None,
            preferred_brands=[],
            preferred_models=[],
            usage_scenario="",
            payment_preference="",
            trade_in_intent=False,
            purchase_timeline_bucket="",
            key_concerns=[],
            competitor_models=[],
        )
        self.make_interaction(low_score_customer, occurred_at=FIXED_NOW - timedelta(days=20))
        self.make_quote(low_score_customer, created_at=FIXED_NOW - timedelta(days=10))
        TestDrive.objects.create(
            customer=low_score_customer,
            scheduled_at=FIXED_NOW - timedelta(days=10),
            status=TestDrive.Status.COMPLETED,
        )

        for customer in (high_score_customer, low_score_customer):
            with self.subTest(customer=customer.id):
                result = calculate_customer_score(customer, now=FIXED_NOW)
                self.assertGreaterEqual(result["customer_score"], 0)
                self.assertLessEqual(result["customer_score"], 100)
                self.assertEqual(
                    result["customer_score"],
                    result["score_breakdown"]["total_score"],
                )

    def test_same_customer_and_now_produce_identical_results(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_interaction(customer)
        self.make_quote(customer, created_at=FIXED_NOW - timedelta(days=1))

        first = calculate_customer_score(customer, now=FIXED_NOW)
        second = calculate_customer_score(customer, now=FIXED_NOW)

        self.assertEqual(first, second)

    def test_other_tenant_data_does_not_affect_customer_score(self):
        customer = self.make_customer()
        self.make_demand_profile(customer)
        self.make_interaction(customer)
        before = calculate_customer_score(customer, now=FIXED_NOW)

        other_tenant = Tenant.objects.create(name="Other Group", code="other-scoring")
        other_store = Store.objects.create(
            tenant=other_tenant,
            name="Other Store",
            code="other-store",
        )
        other_customer = Customer.objects.create(
            tenant=other_tenant,
            store=other_store,
            name="Other Customer",
            stage=Customer.Stage.QUOTED,
        )
        self.make_demand_profile(other_customer)
        self.make_interaction(other_customer)
        self.make_quote(other_customer, created_at=FIXED_NOW - timedelta(days=20))

        after = calculate_customer_score(customer, now=FIXED_NOW)

        self.assertEqual(before, after)


class CustomerLevelPersistenceTests(CustomerScoringTestMixin, TestCase):
    def make_scorable_customer(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_interaction(customer)
        self.make_quote(customer, created_at=FIXED_NOW - timedelta(days=1))
        return customer

    def test_recalculation_persists_result_and_creates_level_history(self):
        customer = self.make_scorable_customer()

        result = recalculate_customer_level(
            customer.id,
            trigger="profile_completed",
            actor=self.user,
            now=FIXED_NOW,
        )

        customer.refresh_from_db()
        self.assertEqual(customer.customer_level, result["customer_level"])
        self.assertEqual(customer.customer_score, result["customer_score"])
        self.assertEqual(customer.level_status, Customer.LevelStatus.ACTIVE)
        self.assertEqual(customer.score_breakdown, result["score_breakdown"])
        self.assertEqual(customer.level_reason, result["level_reason"])
        self.assertEqual(customer.level_updated_at, FIXED_NOW)
        self.assertEqual(customer.scoring_version, "v1")

        history = CustomerLevelHistory.objects.get(customer=customer)
        self.assertEqual(history.old_level, Customer.Level.N)
        self.assertEqual(history.new_level, customer.customer_level)
        self.assertEqual(history.old_score, 0)
        self.assertEqual(history.new_score, customer.customer_score)
        self.assertEqual(history.trigger, "profile_completed")
        self.assertEqual(history.score_breakdown, customer.score_breakdown)
        self.assertEqual(history.actor, self.user)
        self.assertEqual(history.scoring_version, "v1")

    def test_repeated_recalculation_with_same_level_does_not_duplicate_history(self):
        customer = self.make_scorable_customer()
        first = recalculate_customer_level(
            customer.id,
            trigger="first_calculation",
            now=FIXED_NOW,
        )
        history_count = CustomerLevelHistory.objects.filter(customer=customer).count()

        second = recalculate_customer_level(
            customer.id,
            trigger="repeated_calculation",
            now=FIXED_NOW,
        )

        self.assertEqual(first, second)
        self.assertEqual(
            CustomerLevelHistory.objects.filter(customer=customer).count(),
            history_count,
        )

    def test_closed_stages_preserve_last_active_level_and_score(self):
        closed_stages = (
            Customer.Stage.DEPOSIT_PAID,
            Customer.Stage.CONTRACT_SIGNED,
            Customer.Stage.DELIVERED,
            Customer.Stage.LOST,
        )

        for stage in closed_stages:
            with self.subTest(stage=stage):
                customer = self.make_scorable_customer()
                recalculate_customer_level(
                    customer.id,
                    trigger="initial_active_score",
                    now=FIXED_NOW,
                )
                customer.refresh_from_db()
                previous_level = customer.customer_level
                previous_score = customer.customer_score
                previous_breakdown = customer.score_breakdown

                customer.stage = stage
                customer.save(update_fields=["stage", "updated_at"])
                result = recalculate_customer_level(
                    customer.id,
                    trigger="customer_closed",
                    now=FIXED_NOW + timedelta(minutes=1),
                )
                customer.refresh_from_db()

                self.assertEqual(result["level_status"], Customer.LevelStatus.CLOSED)
                self.assertEqual(customer.level_status, Customer.LevelStatus.CLOSED)
                self.assertEqual(customer.customer_level, previous_level)
                self.assertEqual(customer.customer_score, previous_score)
                self.assertEqual(customer.score_breakdown, previous_breakdown)

    def test_closed_order_statuses_preserve_last_active_level_and_score(self):
        inventory = self.make_inventory()
        closed_statuses = (
            Order.Status.DEPOSIT_PAID,
            Order.Status.CONTRACT_SIGNED,
            Order.Status.FINAL_PAYMENT_PENDING,
            Order.Status.READY_FOR_DELIVERY,
            Order.Status.DELIVERED,
            Order.Status.COMPLETED,
        )

        for index, status in enumerate(closed_statuses, start=1):
            with self.subTest(status=status):
                customer = self.make_scorable_customer()
                recalculate_customer_level(
                    customer.id,
                    trigger="initial_active_score",
                    now=FIXED_NOW,
                )
                customer.refresh_from_db()
                previous_level = customer.customer_level
                previous_score = customer.customer_score
                previous_breakdown = customer.score_breakdown
                Order.objects.create(
                    order_number=f"SCORING-ORDER-{index}",
                    customer=customer,
                    inventory=inventory,
                    status=status,
                    total_amount=Decimal("198000.00"),
                )

                result = recalculate_customer_level(
                    customer.id,
                    trigger="order_closed",
                    now=FIXED_NOW + timedelta(minutes=1),
                )
                customer.refresh_from_db()

                self.assertEqual(result["level_status"], Customer.LevelStatus.CLOSED)
                self.assertTrue(any(status in reason for reason in result["closure_reasons"]))
                self.assertEqual(customer.level_status, Customer.LevelStatus.CLOSED)
                self.assertEqual(customer.customer_level, previous_level)
                self.assertEqual(customer.customer_score, previous_score)
                self.assertEqual(customer.score_breakdown, previous_breakdown)


class CustomerScoringApiTriggerTests(CustomerScoringTestMixin, TestCase):
    def test_demand_profile_write_rejects_customer_from_another_tenant(self):
        other_tenant = Tenant.objects.create(name="API Other Group", code="api-other-scoring")
        other_customer = Customer.objects.create(
            tenant=other_tenant,
            name="Other Tenant Customer",
            stage=Customer.Stage.CONTACTED,
        )

        response = self.client.post(
            "/api/customers/demand-profiles/",
            {
                "customer": other_customer.id,
                "budget_min": "180000.00",
                "budget_max": "220000.00",
                "purchase_timeline_bucket": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("customer", response.json())
        self.assertFalse(DemandProfile.objects.filter(customer=other_customer).exists())

    def test_customer_create_and_update_trigger_recalculation(self):
        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            create_response = self.client.post(
                "/api/customers/",
                {
                    "tenant": self.tenant.id,
                    "store": self.store.id,
                    "name": "API Customer",
                    "phone": "13820000001",
                    "stage": Customer.Stage.NEW_LEAD,
                },
                content_type="application/json",
            )

        self.assertEqual(create_response.status_code, 201)
        customer = Customer.objects.get(pk=create_response.json()["id"])
        self.assertEqual(customer.customer_level, Customer.Level.N)
        self.assertEqual(customer.level_status, Customer.LevelStatus.PENDING)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

        self.make_demand_profile(customer)
        self.make_interaction(customer)
        recalculate_customer_level(
            customer.id,
            trigger="test_baseline",
            now=FIXED_NOW,
        )
        customer.refresh_from_db()
        old_score = customer.customer_score

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            update_response = self.client.patch(
                f"/api/customers/{customer.id}/",
                {"stage": Customer.Stage.QUOTED},
                content_type="application/json",
            )

        self.assertEqual(update_response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.stage, Customer.Stage.QUOTED)
        self.assertGreater(customer.customer_score, old_score)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_demand_profile_create_triggers_recalculation(self):
        customer = self.make_customer(stage=Customer.Stage.CONTACTED)
        self.make_interaction(customer)

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            response = self.client.post(
                "/api/customers/demand-profiles/",
                {
                    "customer": customer.id,
                    "budget_min": "180000.00",
                    "budget_max": "220000.00",
                    "preferred_models": ["Nova X"],
                    "energy_type": "bev",
                    "body_type": "SUV",
                    "purchase_timeline_bucket": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        customer.refresh_from_db()
        self.assertEqual(customer.level_status, Customer.LevelStatus.ACTIVE)
        self.assertGreater(customer.customer_score, 0)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_demand_profile_update_triggers_recalculation(self):
        customer = self.make_customer()
        demand = self.make_demand_profile(
            customer,
            purchase_timeline_bucket=DemandProfile.PurchaseTimeline.OVER_90_DAYS,
        )
        self.make_interaction(customer)
        recalculate_customer_level(
            customer.id,
            trigger="test_baseline",
            now=FIXED_NOW,
        )
        customer.refresh_from_db()
        old_score = customer.customer_score

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            response = self.client.patch(
                f"/api/customers/demand-profiles/{demand.id}/",
                {
                    "purchase_timeline_bucket": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertGreater(customer.customer_score, old_score)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_interaction_create_triggers_recalculation(self):
        customer = self.make_customer()
        self.make_demand_profile(customer)
        recalculate_customer_level(
            customer.id,
            trigger="test_baseline",
            now=FIXED_NOW,
        )
        customer.refresh_from_db()
        old_score = customer.customer_score

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            response = self.client.post(
                "/api/customers/interactions/",
                {
                    "customer": customer.id,
                    "channel": Interaction.Channel.PHONE,
                    "occurred_at": FIXED_NOW.isoformat(),
                    "summary": "Customer called back with purchase questions.",
                },
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 201)
        customer.refresh_from_db()
        self.assertGreater(customer.customer_score, old_score)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_interaction_update_triggers_recalculation(self):
        customer = self.make_customer()
        self.make_demand_profile(customer)
        interaction = self.make_interaction(
            customer,
            occurred_at=FIXED_NOW - timedelta(days=15),
        )
        recalculate_customer_level(
            customer.id,
            trigger="test_baseline",
            now=FIXED_NOW,
        )
        customer.refresh_from_db()
        old_score = customer.customer_score

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            response = self.client.patch(
                f"/api/customers/interactions/{interaction.id}/",
                {"occurred_at": FIXED_NOW.isoformat()},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 200)
        customer.refresh_from_db()
        self.assertGreater(customer.customer_score, old_score)
        self.assertEqual(customer.level_updated_at, FIXED_NOW)

    def test_scoring_fields_are_read_only_on_create_and_update(self):
        forged_breakdown = {"forged": True, "total_score": 99}
        forged_values = {
            "customer_level": Customer.Level.A_PLUS,
            "customer_score": 99,
            "level_status": Customer.LevelStatus.ACTIVE,
            "score_breakdown": forged_breakdown,
            "level_reason": "Manually forged score",
            "level_updated_at": "2025-01-01T00:00:00+08:00",
            "scoring_version": "forged",
        }

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            create_response = self.client.post(
                "/api/customers/",
                {
                    "tenant": self.tenant.id,
                    "store": self.store.id,
                    "name": "Read Only Score",
                    "phone": "13820000002",
                    "stage": Customer.Stage.NEW_LEAD,
                    **forged_values,
                },
                content_type="application/json",
            )

        self.assertEqual(create_response.status_code, 201)
        payload = create_response.json()
        expected_fields = {
            "customer_level",
            "customer_level_display",
            "customer_score",
            "level_status",
            "score_breakdown",
            "level_reason",
            "level_updated_at",
            "scoring_version",
        }
        self.assertTrue(expected_fields.issubset(payload))
        customer = Customer.objects.get(pk=payload["id"])
        self.assertEqual(customer.customer_level, Customer.Level.N)
        self.assertEqual(customer.customer_score, 0)
        self.assertEqual(customer.level_status, Customer.LevelStatus.PENDING)
        self.assertNotEqual(customer.score_breakdown, forged_breakdown)
        self.assertEqual(customer.scoring_version, "v1")

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            update_response = self.client.patch(
                f"/api/customers/{customer.id}/",
                forged_values,
                content_type="application/json",
            )

        self.assertEqual(update_response.status_code, 200)
        customer.refresh_from_db()
        self.assertEqual(customer.customer_level, Customer.Level.N)
        self.assertEqual(customer.customer_score, 0)
        self.assertEqual(customer.level_status, Customer.LevelStatus.PENDING)
        self.assertNotEqual(customer.score_breakdown, forged_breakdown)
        self.assertEqual(customer.scoring_version, "v1")


class RecalculateCustomerLevelsCommandTests(CustomerScoringTestMixin, TestCase):
    def test_command_recalculates_a_specific_customer(self):
        customer = self.make_customer(stage=Customer.Stage.QUOTED)
        self.make_demand_profile(customer)
        self.make_interaction(customer)
        self.make_quote(customer, created_at=FIXED_NOW - timedelta(days=1))
        stdout = StringIO()

        with patch(SCORING_NOW_PATCH, return_value=FIXED_NOW):
            call_command(
                "recalculate_customer_levels",
                customer_id=customer.id,
                stdout=stdout,
            )

        customer.refresh_from_db()
        self.assertEqual(customer.level_status, Customer.LevelStatus.ACTIVE)
        self.assertGreater(customer.customer_score, 0)
        self.assertIn("success=1 skipped=0 failed=0", stdout.getvalue())

    def test_tenant_and_customer_filters_are_combined_without_cross_tenant_calls(self):
        own_customer = self.make_customer()
        other_tenant = Tenant.objects.create(name="Command Other Group", code="command-other")
        other_customer = Customer.objects.create(
            tenant=other_tenant,
            name="Other Tenant Customer",
        )
        command_service = (
            "apps.customers.management.commands.recalculate_customer_levels."
            "recalculate_customer_levels_batch"
        )

        with patch(command_service, return_value={own_customer.id: ({}, None)}) as mocked_recalculate:
            tenant_stdout = StringIO()
            call_command(
                "recalculate_customer_levels",
                tenant_id=self.tenant.id,
                stdout=tenant_stdout,
            )
            mocked_recalculate.assert_called_once_with(
                [own_customer.id],
                trigger="management_command",
            )
            self.assertIn("success=1 skipped=0 failed=0", tenant_stdout.getvalue())

            mocked_recalculate.reset_mock()
            intersection_stdout = StringIO()
            call_command(
                "recalculate_customer_levels",
                customer_id=other_customer.id,
                tenant_id=self.tenant.id,
                stdout=intersection_stdout,
            )
            mocked_recalculate.assert_not_called()
            self.assertIn("success=0 skipped=0 failed=0", intersection_stdout.getvalue())

    def test_one_customer_failure_does_not_stop_the_batch(self):
        first_customer = self.make_customer()
        second_customer = self.make_customer()
        stdout = StringIO()
        stderr = StringIO()
        command_service = (
            "apps.customers.management.commands.recalculate_customer_levels."
            "recalculate_customer_levels_batch"
        )

        with self.assertLogs(
            "apps.customers.management.commands.recalculate_customer_levels",
            level="ERROR",
        ):
            with patch(
                command_service,
                return_value={
                    first_customer.id: (None, RuntimeError("broken customer")),
                    second_customer.id: ({}, None),
                },
            ) as mocked_recalculate:
                call_command(
                    "recalculate_customer_levels",
                    tenant_id=self.tenant.id,
                    batch_size=2,
                    stdout=stdout,
                    stderr=stderr,
                )

        mocked_recalculate.assert_called_once_with(
            [first_customer.id, second_customer.id],
            trigger="management_command",
        )
        self.assertIn("success=1 skipped=0 failed=1", stdout.getvalue())
        self.assertIn(f"customer_id={first_customer.id} failed", stderr.getvalue())
        self.assertNotIn(f"customer_id={second_customer.id} failed", stderr.getvalue())

    def test_closed_customer_is_counted_as_skipped(self):
        customer = self.make_customer(
            level_status=Customer.LevelStatus.CLOSED,
            stage=Customer.Stage.DELIVERED,
        )
        stdout = StringIO()
        command_service = (
            "apps.customers.management.commands.recalculate_customer_levels."
            "recalculate_customer_levels_batch"
        )

        with patch(command_service) as mocked_recalculate:
            call_command(
                "recalculate_customer_levels",
                customer_id=customer.id,
                stdout=stdout,
            )

        mocked_recalculate.assert_not_called()
        self.assertIn("success=0 skipped=1 failed=0", stdout.getvalue())
