from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils import timezone

from apps.leads.models import Lead
from apps.sales.models import Order, Quote, TestDrive

from ..models import Customer, CustomerLevelHistory, DemandProfile


logger = logging.getLogger(__name__)

SCORING_VERSION = "v1"

DIMENSION_MAX_SCORES = {
    "purchase_timing": 25,
    "sales_progress": 25,
    "demand_clarity": 15,
    "transaction_feasibility": 15,
    "interaction_activity": 10,
    "decision_readiness": 10,
}

DIMENSION_LABELS = {
    "purchase_timing": "购车时间紧迫度",
    "sales_progress": "销售推进阶段",
    "demand_clarity": "需求明确程度",
    "transaction_feasibility": "交易可行性",
    "interaction_activity": "互动活跃程度",
    "decision_readiness": "决策准备程度",
}

TIMELINE_SCORES = {
    DemandProfile.PurchaseTimeline.WITHIN_7_DAYS: 25,
    DemandProfile.PurchaseTimeline.DAYS_8_TO_15: 20,
    DemandProfile.PurchaseTimeline.DAYS_16_TO_30: 15,
    DemandProfile.PurchaseTimeline.DAYS_31_TO_60: 10,
    DemandProfile.PurchaseTimeline.DAYS_61_TO_90: 5,
    DemandProfile.PurchaseTimeline.OVER_90_DAYS: 2,
}

# Legacy text is supported only through exact, reviewable values. There is no
# substring matching or natural-language inference in the scoring path.
LEGACY_TIMELINE_BUCKETS = {
    "within_7_days": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "within 7 days": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "7_days": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "7 days": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "7天以内": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "7天内": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "一周内": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "本周": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "本周购买": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "今天能谈好就定": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "this week": DemandProfile.PurchaseTimeline.WITHIN_7_DAYS,
    "8_to_15_days": DemandProfile.PurchaseTimeline.DAYS_8_TO_15,
    "8-15 days": DemandProfile.PurchaseTimeline.DAYS_8_TO_15,
    "8—15天": DemandProfile.PurchaseTimeline.DAYS_8_TO_15,
    "8-15天": DemandProfile.PurchaseTimeline.DAYS_8_TO_15,
    "16_to_30_days": DemandProfile.PurchaseTimeline.DAYS_16_TO_30,
    "16-30 days": DemandProfile.PurchaseTimeline.DAYS_16_TO_30,
    "16—30天": DemandProfile.PurchaseTimeline.DAYS_16_TO_30,
    "16-30天": DemandProfile.PurchaseTimeline.DAYS_16_TO_30,
    "31_to_60_days": DemandProfile.PurchaseTimeline.DAYS_31_TO_60,
    "31-60 days": DemandProfile.PurchaseTimeline.DAYS_31_TO_60,
    "31—60天": DemandProfile.PurchaseTimeline.DAYS_31_TO_60,
    "31-60天": DemandProfile.PurchaseTimeline.DAYS_31_TO_60,
    "61_to_90_days": DemandProfile.PurchaseTimeline.DAYS_61_TO_90,
    "61-90 days": DemandProfile.PurchaseTimeline.DAYS_61_TO_90,
    "61—90天": DemandProfile.PurchaseTimeline.DAYS_61_TO_90,
    "61-90天": DemandProfile.PurchaseTimeline.DAYS_61_TO_90,
    "over_90_days": DemandProfile.PurchaseTimeline.OVER_90_DAYS,
    "over 90 days": DemandProfile.PurchaseTimeline.OVER_90_DAYS,
    "after 90 days": DemandProfile.PurchaseTimeline.OVER_90_DAYS,
    "90天以后": DemandProfile.PurchaseTimeline.OVER_90_DAYS,
}

STAGE_SCORES = {
    Customer.Stage.NEW_LEAD: 0,
    Customer.Stage.CONTACTED: 4,
    Customer.Stage.QUALIFIED: 7,
    Customer.Stage.INVITED: 10,
    Customer.Stage.TEST_DRIVE_BOOKED: 13,
    Customer.Stage.TEST_DRIVEN: 17,
    Customer.Stage.QUOTED: 21,
}

CLOSED_STAGES = {
    Customer.Stage.DEPOSIT_PAID,
    Customer.Stage.CONTRACT_SIGNED,
    Customer.Stage.DELIVERED,
    Customer.Stage.LOST,
}

CLOSED_ORDER_STATUSES = {
    Order.Status.DEPOSIT_PAID,
    Order.Status.CONTRACT_SIGNED,
    Order.Status.FINAL_PAYMENT_PENDING,
    Order.Status.READY_FOR_DELIVERY,
    Order.Status.DELIVERED,
    Order.Status.COMPLETED,
}

RISK_DEDUCTIONS = {
    "quote_no_feedback_over_7_days": 5,
    "test_drive_no_interaction_over_5_days": 4,
}

UNSUPPORTED_RISK_FIELDS = [
    "multiple_unanswered_contacts",
    "significant_budget_gap",
    "purchase_plan_postponed",
    "competitor_locked_in",
    "invalid_contact_or_identity",
    "customer_level_duplicate_or_non_genuine_flag",
]


def map_score_to_level(score: int) -> str:
    """Map a bounded numeric score to the V1 active customer level."""
    bounded_score = max(0, min(100, int(score)))
    if bounded_score >= 85:
        return Customer.Level.A_PLUS
    if bounded_score >= 70:
        return Customer.Level.A
    if bounded_score >= 50:
        return Customer.Level.B
    if bounded_score >= 25:
        return Customer.Level.C
    return Customer.Level.D


def _effective_now(now: datetime | None) -> datetime:
    value = now or timezone.now()
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return value


def _related_items(instance: Any, relation_name: str) -> list[Any]:
    relation = getattr(instance, relation_name, None)
    return list(relation.all()) if relation is not None else []


def _demand_profile(customer: Customer) -> DemandProfile | None:
    try:
        return customer.demand_profile
    except ObjectDoesNotExist:
        return None


def _has_list_value(value: Any) -> bool:
    if isinstance(value, (list, tuple, set)):
        return any(str(item).strip() for item in value)
    return False


def _positive_decimal(value: Any) -> Decimal | None:
    try:
        amount = Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        return None
    return amount if amount > 0 else None


def _new_dimension(name: str) -> dict[str, Any]:
    return {
        "score": 0,
        "max_score": DIMENSION_MAX_SCORES[name],
        "status": "scored",
        "items": [],
        "missing_data": [],
    }


def _add_score(dimension: dict[str, Any], *, rule: str, score: int, evidence: str) -> None:
    dimension["score"] += score
    dimension["items"].append({"rule": rule, "score": score, "evidence": evidence})


def _finalize_dimension(dimension: dict[str, Any]) -> dict[str, Any]:
    dimension["score"] = max(0, min(dimension["max_score"], dimension["score"]))
    if dimension["missing_data"] and dimension["items"]:
        dimension["status"] = "partial"
    elif dimension["missing_data"]:
        dimension["status"] = "missing_data"
    return dimension


def _timeline_bucket(
    customer: Customer,
    profile: DemandProfile | None,
    source_leads: list[Any],
) -> tuple[str | None, str | None]:
    if profile and profile.purchase_timeline_bucket:
        if profile.purchase_timeline_bucket in TIMELINE_SCORES:
            return profile.purchase_timeline_bucket, "demand_profile.purchase_timeline_bucket"
        return None, None

    if profile and profile.purchase_timeline:
        bucket = LEGACY_TIMELINE_BUCKETS.get(profile.purchase_timeline.strip().casefold())
        return (bucket, "demand_profile.purchase_timeline") if bucket else (None, None)

    trusted_leads = sorted(
        (
            lead
            for lead in source_leads
            if lead.tenant_id == customer.tenant_id
            and lead.status in {Lead.Status.QUALIFIED, Lead.Status.CONVERTED}
            and lead.purchase_timeline
        ),
        key=lambda lead: (lead.updated_at, lead.pk),
        reverse=True,
    )
    if trusted_leads:
        latest_lead = trusted_leads[0]
        bucket = LEGACY_TIMELINE_BUCKETS.get(latest_lead.purchase_timeline.strip().casefold())
        if bucket:
            return bucket, f"source_lead:{latest_lead.pk}.purchase_timeline"
    return None, None


def _budget_is_clear(profile: DemandProfile | None) -> bool:
    if not profile:
        return False
    minimum = _positive_decimal(profile.budget_min)
    maximum = _positive_decimal(profile.budget_max)
    return bool(minimum and maximum and minimum <= maximum)


def _vehicle_direction_is_clear(
    customer: Customer,
    profile: DemandProfile | None,
    sales_records: list[Any],
) -> bool:
    if profile and (_has_list_value(profile.preferred_models) or bool(profile.body_type.strip())):
        return True
    return any(
        getattr(record, "inventory_id", None) and _record_inventory_matches_tenant(record, customer)
        for record in sales_records
    )


def _closed_reasons(customer: Customer, orders: list[Order]) -> list[str]:
    reasons: list[str] = []
    if customer.stage in CLOSED_STAGES:
        reasons.append(f"customer_stage:{customer.stage}")
    for order in orders:
        if order.status in CLOSED_ORDER_STATUSES:
            reasons.append(f"order:{order.pk}:{order.status}")
        elif _positive_decimal(order.paid_amount):
            reasons.append(f"order:{order.pk}:paid_amount")
    return reasons


def _pending_reasons(
    customer: Customer,
    *,
    budget_clear: bool,
    vehicle_clear: bool,
    timeline_bucket: str | None,
) -> list[str]:
    reasons: list[str] = []
    if customer.stage == Customer.Stage.NEW_LEAD:
        reasons.append("新线索尚未完成首次联系")
    if not budget_clear and not vehicle_clear and not timeline_bucket:
        reasons.append("预算、车型方向和购车时间均未明确")
    return reasons


def _pending_breakdown(reasons: list[str]) -> dict[str, Any]:
    dimensions = {
        name: {
            "score": 0,
            "max_score": max_score,
            "status": "unscored",
            "items": [],
            "missing_data": [],
        }
        for name, max_score in DIMENSION_MAX_SCORES.items()
    }
    return {
        "scoring_version": SCORING_VERSION,
        "status": Customer.LevelStatus.PENDING,
        "dimensions": dimensions,
        "base_score": 0,
        "risk": {
            "raw_deduction": 0,
            "applied_deduction": 0,
            "max_deduction": 20,
            "reasons": [],
            "missing_data": list(UNSUPPORTED_RISK_FIELDS),
        },
        "total_score": 0,
        "missing_data": reasons,
    }


def _purchase_timing_dimension(bucket: str | None, source: str | None) -> dict[str, Any]:
    dimension = _new_dimension("purchase_timing")
    if bucket:
        _add_score(
            dimension,
            rule=bucket,
            score=TIMELINE_SCORES[bucket],
            evidence=source or "purchase_timeline",
        )
    else:
        dimension["missing_data"].append("purchase_timeline_bucket")
    return _finalize_dimension(dimension)


def _sales_progress_dimension(customer: Customer) -> dict[str, Any]:
    dimension = _new_dimension("sales_progress")
    stage_score = STAGE_SCORES.get(customer.stage, 0)
    _add_score(dimension, rule=customer.stage, score=stage_score, evidence="customer.stage")
    # The current schema has no active stage that reliably means discount,
    # finance, or deposit confirmation, so the documented 25-point row is not inferred.
    dimension["missing_data"].append("negotiation_finance_or_deposit_confirmation_stage")
    return _finalize_dimension(dimension)


def _demand_clarity_dimension(customer: Customer, profile: DemandProfile | None) -> dict[str, Any]:
    dimension = _new_dimension("demand_clarity")
    if _budget_is_clear(profile):
        _add_score(dimension, rule="budget_range_clear", score=3, evidence="demand_profile.budget_min/max")
    else:
        dimension["missing_data"].append("budget_range")

    if profile and (_has_list_value(profile.preferred_models) or profile.body_type.strip()):
        evidence = "demand_profile.preferred_models" if _has_list_value(profile.preferred_models) else "demand_profile.body_type"
        _add_score(dimension, rule="vehicle_direction_clear", score=3, evidence=evidence)
    else:
        dimension["missing_data"].append("preferred_model_or_body_type")

    if profile and profile.energy_type.strip():
        _add_score(dimension, rule="energy_type_clear", score=2, evidence="demand_profile.energy_type")
    else:
        dimension["missing_data"].append("energy_type")

    if profile and profile.usage_scenario.strip():
        _add_score(dimension, rule="usage_clear", score=2, evidence="demand_profile.usage_scenario")
    else:
        dimension["missing_data"].append("usage_scenario")

    if profile and profile.seats:
        _add_score(dimension, rule="configuration_preference_clear", score=2, evidence="demand_profile.seats")
    else:
        dimension["missing_data"].append("configuration_color_or_seats")

    # Customer.city is a contact city, not a verified purchase or registration city.
    dimension["missing_data"].append("purchase_or_registration_city")

    if profile and _has_list_value(profile.key_concerns):
        _add_score(dimension, rule="key_concerns_clear", score=2, evidence="demand_profile.key_concerns")
    else:
        dimension["missing_data"].append("key_concerns")
    return _finalize_dimension(dimension)


def _inventory_price(inventory: Any, customer: Customer) -> tuple[Decimal | None, str | None]:
    if not inventory:
        return None, None
    try:
        if inventory.store.tenant_id != customer.tenant_id:
            return None, None
    except ObjectDoesNotExist:
        return None, None

    price_fields = (
        ("negotiable_price", inventory.negotiable_price),
        ("listed_price", inventory.listed_price),
        ("trim.official_price", getattr(getattr(inventory, "trim", None), "official_price", None)),
    )
    for field_name, value in price_fields:
        price = _positive_decimal(value)
        if price:
            return price, f"inventory:{inventory.pk}.{field_name}"
    return None, None


def _record_inventory_matches_tenant(record: Any, customer: Customer) -> bool:
    """Allow standalone quotes, but reject prices tied to another tenant's stock."""
    if not getattr(record, "inventory_id", None):
        return True
    try:
        return record.inventory.store.tenant_id == customer.tenant_id
    except ObjectDoesNotExist:
        return False


def _target_price(
    customer: Customer,
    quotes: list[Quote],
    orders: list[Order],
    test_drives: list[TestDrive],
) -> tuple[Decimal | None, str | None]:
    priced_quotes = [
        quote
        for quote in quotes
        if _positive_decimal(quote.landing_price) and _record_inventory_matches_tenant(quote, customer)
    ]
    if priced_quotes:
        latest_quote = max(priced_quotes, key=lambda quote: (quote.created_at, quote.pk))
        return _positive_decimal(latest_quote.landing_price), f"quote:{latest_quote.pk}.landing_price"

    records = [*quotes, *orders, *test_drives]
    records.sort(
        key=lambda record: (
            getattr(record, "created_at", None) or getattr(record, "scheduled_at", None),
            record.pk,
        ),
        reverse=True,
    )
    for record in records:
        price, evidence = _inventory_price(getattr(record, "inventory", None), customer)
        if price:
            return price, evidence
    return None, None


def _transaction_feasibility_dimension(
    customer: Customer,
    profile: DemandProfile | None,
    quotes: list[Quote],
    orders: list[Order],
    test_drives: list[TestDrive],
) -> dict[str, Any]:
    dimension = _new_dimension("transaction_feasibility")
    target_price, price_source = _target_price(customer, quotes, orders, test_drives)
    budget_max = _positive_decimal(profile.budget_max) if _budget_is_clear(profile) else None
    if target_price and budget_max:
        if budget_max >= target_price:
            _add_score(
                dimension,
                rule="budget_covers_target_price",
                score=5,
                evidence=f"demand_profile.budget_max>={price_source}",
            )
        else:
            dimension["items"].append(
                {
                    "rule": "budget_does_not_cover_target_price",
                    "score": 0,
                    "evidence": f"demand_profile.budget_max<{price_source}",
                }
            )
            dimension["missing_data"].append("resolvable_budget_gap")
    else:
        if not budget_max:
            dimension["missing_data"].append("budget_max")
        if not target_price:
            dimension["missing_data"].append("reliable_target_price")

    if profile and profile.payment_preference.strip():
        _add_score(dimension, rule="payment_method_clear", score=3, evidence="demand_profile.payment_preference")
    else:
        dimension["missing_data"].append("payment_method")

    dimension["missing_data"].extend(
        [
            "loan_qualification_and_affordable_monthly_payment",
            "trade_in_vehicle_details",
            "purchase_and_registration_eligibility",
        ]
    )
    return _finalize_dimension(dimension)


def _valid_event_times(
    interactions: list[Any],
    test_drives: list[TestDrive],
    now: datetime,
) -> tuple[list[datetime], list[datetime]]:
    interaction_times = [
        interaction.occurred_at
        for interaction in interactions
        if interaction.occurred_at and interaction.occurred_at <= now
    ]
    completed_test_drive_times = [
        drive.completed_at
        for drive in test_drives
        if drive.status == TestDrive.Status.COMPLETED
        and drive.completed_at
        and drive.completed_at <= now
    ]
    return interaction_times, completed_test_drive_times


def _interaction_activity_dimension(
    interactions: list[Any],
    test_drives: list[TestDrive],
    now: datetime,
) -> dict[str, Any]:
    dimension = _new_dimension("interaction_activity")
    interaction_times, completed_drive_times = _valid_event_times(interactions, test_drives, now)
    effective_times = [*interaction_times, *completed_drive_times]
    if not effective_times:
        dimension["missing_data"].append("effective_interaction")
        dimension["missing_data"].append("interaction_effectiveness_flag")
        if any(
            drive.status == TestDrive.Status.COMPLETED and not drive.completed_at
            for drive in test_drives
        ):
            dimension["missing_data"].append("test_drive_completed_at")
        return _finalize_dimension(dimension)

    latest = max(effective_times)
    age = now - latest
    if age <= timedelta(hours=24):
        score = 10
        rule = "within_24_hours"
    elif age <= timedelta(days=3):
        score = 8
        rule = "within_2_to_3_days"
    elif age <= timedelta(days=7):
        score = 5
        rule = "within_4_to_7_days"
    elif age <= timedelta(days=14):
        score = 2
        rule = "within_8_to_14_days"
    else:
        score = 0
        rule = "over_14_days"
    _add_score(dimension, rule=rule, score=score, evidence="latest persisted Interaction or completed TestDrive")
    # V1 treats persisted Interaction rows as effective; the schema cannot
    # distinguish broadcasts or system delivery events yet.
    dimension["missing_data"].append("interaction_effectiveness_flag")
    if any(
        drive.status == TestDrive.Status.COMPLETED and not drive.completed_at
        for drive in test_drives
    ):
        dimension["missing_data"].append("test_drive_completed_at")
    return _finalize_dimension(dimension)


def _decision_readiness_dimension(
    profile: DemandProfile | None,
    quotes: list[Quote],
    test_drives: list[TestDrive],
) -> dict[str, Any]:
    dimension = _new_dimension("decision_readiness")
    if profile and _has_list_value(profile.competitor_models):
        _add_score(dimension, rule="competitor_range_clear", score=2, evidence="demand_profile.competitor_models")
    else:
        dimension["missing_data"].append("competitor_range")

    accepted_next_action = any(
        drive.status in {TestDrive.Status.BOOKED, TestDrive.Status.ARRIVED, TestDrive.Status.COMPLETED}
        for drive in test_drives
    ) or any(quote.status == Quote.Status.ACCEPTED for quote in quotes)
    if accepted_next_action:
        _add_score(
            dimension,
            rule="accepted_next_sales_action",
            score=2,
            evidence="booked/completed TestDrive or accepted Quote",
        )
    else:
        dimension["missing_data"].append("accepted_next_sales_action")

    dimension["missing_data"].extend(
        [
            "final_decision_maker",
            "joint_decision_alignment",
            "most_important_closing_condition",
        ]
    )
    return _finalize_dimension(dimension)


def _risk_breakdown(
    quotes: list[Quote],
    test_drives: list[TestDrive],
    interactions: list[Any],
    now: datetime,
) -> dict[str, Any]:
    interaction_times, completed_drive_times = _valid_event_times(interactions, test_drives, now)
    effective_times = [*interaction_times, *completed_drive_times]
    reasons: list[dict[str, Any]] = []

    eligible_quotes = [quote for quote in quotes if quote.created_at <= now]
    missing_data = [*UNSUPPORTED_RISK_FIELDS, "risk_interaction_effectiveness_flag"]
    if eligible_quotes:
        latest_quote = max(eligible_quotes, key=lambda quote: (quote.created_at, quote.pk))
        if latest_quote.status == Quote.Status.SENT:
            if latest_quote.sent_at and latest_quote.sent_at <= now:
                if now - latest_quote.sent_at > timedelta(days=7) and not any(
                    event_time > latest_quote.sent_at for event_time in effective_times
                ):
                    reasons.append(
                        {
                            "code": "quote_no_feedback_over_7_days",
                            "deduction": RISK_DEDUCTIONS["quote_no_feedback_over_7_days"],
                            "evidence": f"quote:{latest_quote.pk}.sent_at",
                        }
                    )
            else:
                missing_data.append("quote_sent_at")

    completed_drives = [drive for drive in test_drives if drive.status == TestDrive.Status.COMPLETED]
    if completed_drives:
        latest_drive = max(completed_drives, key=lambda drive: (drive.created_at, drive.pk))
        if latest_drive.completed_at and latest_drive.completed_at <= now:
            if now - latest_drive.completed_at > timedelta(days=5) and not any(
                event_time > latest_drive.completed_at for event_time in effective_times
            ):
                reasons.append(
                    {
                        "code": "test_drive_no_interaction_over_5_days",
                        "deduction": RISK_DEDUCTIONS["test_drive_no_interaction_over_5_days"],
                        "evidence": f"test_drive:{latest_drive.pk}.completed_at",
                    }
                )
        else:
            missing_data.append("test_drive_completed_at")

    raw_deduction = sum(reason["deduction"] for reason in reasons)
    return {
        "raw_deduction": raw_deduction,
        "applied_deduction": min(20, raw_deduction),
        "max_deduction": 20,
        "reasons": reasons,
        "missing_data": missing_data,
    }


def _level_reason(dimensions: dict[str, dict[str, Any]], risk: dict[str, Any]) -> str:
    ranked = sorted(
        ((name, details["score"]) for name, details in dimensions.items() if details["score"] > 0),
        key=lambda item: (-item[1], list(DIMENSION_MAX_SCORES).index(item[0])),
    )
    parts = [f"{DIMENSION_LABELS[name]} {score} 分" for name, score in ranked[:2]]
    if risk["applied_deduction"]:
        parts.append(f"风险扣分 {risk['applied_deduction']} 分")
    if not parts:
        return "当前可验证信息得分较低；缺失数据按 0 分处理"
    return "；".join(parts)


def calculate_customer_score(customer: Customer, now: datetime | None = None) -> dict[str, Any]:
    """Calculate a deterministic V1 score from structured, persisted fields."""
    effective_now = _effective_now(now)
    profile = _demand_profile(customer)
    interactions = _related_items(customer, "interactions")
    test_drives = [
        drive
        for drive in _related_items(customer, "test_drives")
        if _record_inventory_matches_tenant(drive, customer)
    ]
    quotes = [
        quote
        for quote in _related_items(customer, "quotes")
        if _record_inventory_matches_tenant(quote, customer)
    ]
    orders = [
        order
        for order in _related_items(customer, "orders")
        if _record_inventory_matches_tenant(order, customer)
    ]
    source_leads = _related_items(customer, "source_leads")

    closure_reasons = _closed_reasons(customer, orders)
    if closure_reasons:
        return {
            "customer_level": customer.customer_level,
            "customer_score": customer.customer_score,
            "level_status": Customer.LevelStatus.CLOSED,
            "score_breakdown": customer.score_breakdown,
            "level_reason": customer.level_reason,
            "scoring_version": customer.scoring_version or SCORING_VERSION,
            "closure_reasons": closure_reasons,
        }

    timeline_bucket, timeline_source = _timeline_bucket(customer, profile, source_leads)
    budget_clear = _budget_is_clear(profile)
    vehicle_clear = _vehicle_direction_is_clear(
        customer,
        profile,
        [*quotes, *orders, *test_drives],
    )
    pending_reasons = _pending_reasons(
        customer,
        budget_clear=budget_clear,
        vehicle_clear=vehicle_clear,
        timeline_bucket=timeline_bucket,
    )
    if pending_reasons:
        return {
            "customer_level": Customer.Level.N,
            "customer_score": 0,
            "level_status": Customer.LevelStatus.PENDING,
            "score_breakdown": _pending_breakdown(pending_reasons),
            "level_reason": "信息不足：" + "；".join(pending_reasons),
            "scoring_version": SCORING_VERSION,
        }

    dimensions = {
        "purchase_timing": _purchase_timing_dimension(timeline_bucket, timeline_source),
        "sales_progress": _sales_progress_dimension(customer),
        "demand_clarity": _demand_clarity_dimension(customer, profile),
        "transaction_feasibility": _transaction_feasibility_dimension(
            customer,
            profile,
            quotes,
            orders,
            test_drives,
        ),
        "interaction_activity": _interaction_activity_dimension(interactions, test_drives, effective_now),
        "decision_readiness": _decision_readiness_dimension(profile, quotes, test_drives),
    }
    base_score = sum(dimension["score"] for dimension in dimensions.values())
    risk = _risk_breakdown(quotes, test_drives, interactions, effective_now)
    total_score = max(0, min(100, base_score - risk["applied_deduction"]))
    missing_data = [
        f"{dimension_name}.{field_name}"
        for dimension_name, dimension in dimensions.items()
        for field_name in dimension["missing_data"]
    ]
    missing_data.extend(f"risk.{field_name}" for field_name in risk["missing_data"])
    breakdown = {
        "scoring_version": SCORING_VERSION,
        "status": Customer.LevelStatus.ACTIVE,
        "dimensions": dimensions,
        "base_score": base_score,
        "risk": risk,
        "total_score": total_score,
        "missing_data": missing_data,
    }
    return {
        "customer_level": map_score_to_level(total_score),
        "customer_score": total_score,
        "level_status": Customer.LevelStatus.ACTIVE,
        "score_breakdown": breakdown,
        "level_reason": _level_reason(dimensions, risk),
        "scoring_version": SCORING_VERSION,
    }


def _scoring_queryset():
    # Keep the lock query on Customer itself. PostgreSQL rejects FOR UPDATE on
    # the nullable side of the outer join produced by select_related here.
    return Customer.objects.select_for_update().prefetch_related(
        "demand_profile",
        "interactions",
        "test_drives__inventory__store",
        "test_drives__inventory__trim",
        "quotes__inventory__store",
        "quotes__inventory__trim",
        "orders__inventory__store",
        "orders__inventory__trim",
        "source_leads",
    )


def _persist_calculation(
    customer: Customer,
    result: dict[str, Any],
    *,
    trigger: str,
    actor: Any,
    calculated_at: datetime,
) -> None:
    old_level = customer.customer_level
    old_score = customer.customer_score
    if result["level_status"] == Customer.LevelStatus.CLOSED:
        desired_fields = {"level_status": Customer.LevelStatus.CLOSED}
    else:
        desired_fields = {
            "customer_level": result["customer_level"],
            "customer_score": result["customer_score"],
            "level_status": result["level_status"],
            "score_breakdown": result["score_breakdown"],
            "level_reason": result["level_reason"],
            "scoring_version": result["scoring_version"],
        }

    changed = any(getattr(customer, field) != value for field, value in desired_fields.items())
    if not changed:
        return

    desired_fields["level_updated_at"] = calculated_at
    Customer.objects.filter(pk=customer.pk).update(**desired_fields)
    new_level = desired_fields.get("customer_level", customer.customer_level)
    new_score = desired_fields.get("customer_score", customer.customer_score)
    if old_level != new_level:
        CustomerLevelHistory.objects.create(
            customer=customer,
            old_level=old_level,
            new_level=new_level,
            old_score=old_score,
            new_score=new_score,
            trigger=(str(trigger).strip() or "unspecified")[:120],
            score_breakdown=result["score_breakdown"],
            reason=result["level_reason"],
            scoring_version=result["scoring_version"],
            actor=actor if getattr(actor, "pk", None) else None,
        )


@transaction.atomic
def recalculate_customer_level(
    customer_id: int,
    trigger: str,
    actor: Any = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Lock, recalculate, persist, and record a real level transition atomically."""
    effective_now = _effective_now(now)
    customer = _scoring_queryset().get(pk=customer_id)
    result = calculate_customer_score(customer, now=effective_now)
    _persist_calculation(
        customer,
        result,
        trigger=trigger,
        actor=actor,
        calculated_at=effective_now,
    )
    return result


def recalculate_customer_levels_batch(
    customer_ids: list[int],
    trigger: str,
    actor: Any = None,
    now: datetime | None = None,
) -> dict[int, tuple[dict[str, Any] | None, Exception | None]]:
    """Recalculate one chunk with constant related-data reads and isolated failures."""
    unique_ids = list(dict.fromkeys(customer_ids))
    if not unique_ids:
        return {}

    effective_now = _effective_now(now)
    outcomes: dict[int, tuple[dict[str, Any] | None, Exception | None]] = {}
    with transaction.atomic():
        customers = list(_scoring_queryset().filter(pk__in=unique_ids).order_by("pk"))
        customers_by_id = {customer.pk: customer for customer in customers}
        for customer_id in unique_ids:
            if customer_id not in customers_by_id:
                outcomes[customer_id] = (None, Customer.DoesNotExist(f"Customer {customer_id} does not exist."))

        for customer in customers:
            try:
                result = calculate_customer_score(customer, now=effective_now)
                # A savepoint keeps an individual persistence error from aborting
                # the rest of the preloaded chunk.
                with transaction.atomic():
                    _persist_calculation(
                        customer,
                        result,
                        trigger=trigger,
                        actor=actor,
                        calculated_at=effective_now,
                    )
            except Exception as exc:
                outcomes[customer.pk] = (None, exc)
            else:
                outcomes[customer.pk] = (result, None)
    return outcomes


def recalculate_customer_level_safely(
    customer_id: int,
    trigger: str,
    actor: Any = None,
    now: datetime | None = None,
) -> dict[str, Any] | None:
    """Log scoring failures without rolling back the business write that triggered them."""
    try:
        return recalculate_customer_level(customer_id, trigger, actor=actor, now=now)
    except Customer.DoesNotExist:
        logger.warning("Customer scoring skipped because customer %s no longer exists (trigger=%s)", customer_id, trigger)
    except Exception:
        logger.exception("Customer scoring failed for customer %s (trigger=%s)", customer_id, trigger)
    return None
