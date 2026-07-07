import re
from decimal import Decimal
from typing import Any

from apps.customers.models import Customer, DemandProfile
from apps.vehicles.models import SalesPolicy, VehicleInventory


TEN_THOUSAND = Decimal("10000")


def _money(value: Decimal | None) -> str:
    if value is None:
        return "0.00"
    return f"{value.quantize(Decimal('0.01'))}"


def _normalize_budget_value(value: str, unit: str | None = None) -> Decimal:
    amount = Decimal(value)
    normalized_unit = (unit or "").lower()
    if normalized_unit in {"w", "\u4e07"}:
        return amount * TEN_THOUSAND
    if normalized_unit == "k":
        return amount * Decimal("1000")
    if amount < Decimal("1000"):
        return amount * TEN_THOUSAND
    return amount


def _extract_budget(message: str) -> tuple[Decimal | None, Decimal | None]:
    normalized = message.lower().replace(",", "")
    range_match = re.search(
        r"(\d+(?:\.\d+)?)\s*(w|k|\u4e07)?(?![a-z])\s*(?:-|~|\u5230|\u81f3|to)\s*(\d+(?:\.\d+)?)\s*(w|k|\u4e07)?(?![a-z])",
        normalized,
    )
    if range_match:
        low_value, low_unit, high_value, high_unit = range_match.groups()
        shared_unit = high_unit if high_unit and not low_unit else None
        low = _normalize_budget_value(low_value, low_unit or shared_unit)
        high = _normalize_budget_value(high_value, high_unit)
        if low > high:
            low, high = high, low
        return low, high

    numbers = [Decimal(match) for match in re.findall(r"\d+(?:\.\d+)?", normalized)]
    if not numbers:
        return None, None
    unit_match = re.search(r"\d+(?:\.\d+)?\s*(w|k|\u4e07)", normalized)
    primary = _normalize_budget_value(str(numbers[0]), unit_match.group(1) if unit_match else None)
    return primary * Decimal("0.9"), primary * Decimal("1.1")


def _demand_from_message(message: str) -> dict[str, Any]:
    lower = message.lower()
    budget_min, budget_max = _extract_budget(message)
    energy_type = ""
    if (
        "bev" in lower
        or "ev" in lower
        or "electric" in lower
        or "\u7eaf\u7535" in lower
        or "\u65b0\u80fd\u6e90" in lower
    ):
        energy_type = "bev"
    body_type = "SUV" if "suv" in lower else ""
    usage_scenario = "家庭用车" if "family" in lower or "\u5bb6\u5ead" in lower or "\u5bb6\u7528" in lower else ""
    return {
        "budget_min": budget_min,
        "budget_max": budget_max,
        "energy_type": energy_type,
        "body_type": body_type,
        "usage_scenario": usage_scenario,
        "key_concerns": [],
    }


def _demand_from_customer(customer_id: int | None) -> dict[str, Any]:
    if not customer_id:
        return {}
    profile = DemandProfile.objects.filter(customer_id=customer_id).first()
    if not profile:
        return {}
    return {
        "budget_min": profile.budget_min,
        "budget_max": profile.budget_max,
        "energy_type": profile.energy_type,
        "body_type": profile.body_type,
        "usage_scenario": profile.usage_scenario,
        "key_concerns": profile.key_concerns,
        "preferred_brands": profile.preferred_brands,
        "preferred_models": profile.preferred_models,
    }


def _score_inventory(vehicle: VehicleInventory, demand: dict[str, Any]) -> tuple[int, list[str], list[str]]:
    score = 45
    reasons: list[str] = []
    risks: list[str] = []
    trim = vehicle.trim
    model = trim.model
    price = vehicle.negotiable_price or vehicle.listed_price or trim.official_price

    budget_min = demand.get("budget_min")
    budget_max = demand.get("budget_max")
    if price and budget_min and budget_max:
        if budget_min <= price <= budget_max:
            score += 25
            reasons.append("价格落在客户预算区间内。")
        elif price <= budget_max * Decimal("1.08"):
            score += 10
            reasons.append("价格略高于预算，但可结合优惠政策继续沟通。")
        else:
            risks.append("价格可能超出客户预算。")

    body_type = (demand.get("body_type") or "").lower()
    if body_type and model.body_type.lower() == body_type:
        score += 15
        reasons.append(f"车身类型匹配：{model.body_type}。")

    energy_type = demand.get("energy_type")
    if energy_type and model.energy_type == energy_type:
        score += 15
        reasons.append("能源类型符合客户偏好。")

    if vehicle.status == VehicleInventory.Status.AVAILABLE:
        score += 8
        reasons.append("当前有现车，可推进到店试驾或交付确认。")
    elif vehicle.status == VehicleInventory.Status.IN_TRANSIT:
        risks.append("车辆在途，需要确认预计到店时间。")
    else:
        risks.append(f"库存状态为 {vehicle.status}，需要销售确认。")

    policy = (
        SalesPolicy.objects.filter(store=vehicle.store, model=model, is_active=True)
        .order_by("-amount", "-created_at")
        .first()
    )
    if policy:
        score += 7
        reasons.append(f"可叠加当前销售政策：{policy.title}。")

    return min(score, 100), reasons[:5], risks[:3]


def recommend_vehicles(
    *,
    message: str = "",
    customer_id: int | None = None,
    store_id: int | None = None,
    limit: int = 3,
) -> dict[str, Any]:
    demand = _demand_from_message(message)
    demand.update({k: v for k, v in _demand_from_customer(customer_id).items() if v not in (None, "", [], {})})

    inventory = VehicleInventory.objects.select_related(
        "store",
        "trim",
        "trim__model",
        "trim__model__series",
        "trim__model__series__brand",
    ).all()
    if store_id:
        inventory = inventory.filter(store_id=store_id)

    scored = []
    for vehicle in inventory:
        score, reasons, risks = _score_inventory(vehicle, demand)
        scored.append((score, vehicle, reasons, risks))

    scored.sort(key=lambda item: item[0], reverse=True)
    cards = []
    for score, vehicle, reasons, risks in scored[:limit]:
        trim = vehicle.trim
        model = trim.model
        series = model.series
        brand = series.brand
        title_parts = [brand.name]
        if not model.name.lower().startswith(series.name.lower()):
            title_parts.append(series.name)
        title_parts.extend([model.name, trim.name])
        policy = (
            SalesPolicy.objects.filter(store=vehicle.store, model=model, is_active=True)
            .order_by("-amount", "-created_at")
            .first()
        )
        cards.append(
            {
                "inventory_id": vehicle.id,
                "vin": vehicle.vin,
                "vehicle_model_id": model.id,
                "title": " ".join(title_parts),
                "brand": brand.name,
                "model": model.name,
                "trim": trim.name,
                "price": _money(vehicle.negotiable_price or vehicle.listed_price or trim.official_price),
                "official_price": _money(trim.official_price),
                "inventory_status": vehicle.status,
                "exterior_color": vehicle.exterior_color,
                "range_km": trim.range_km,
                "match_score": score,
                "reasons": reasons or ["基于当前库存和客户需求，整体匹配度较高。"],
                "risks": risks,
                "policy": {
                    "title": policy.title if policy else "",
                    "amount": _money(policy.amount) if policy else "0.00",
                },
                "actions": ["generate_quote", "book_test_drive", "generate_followup"],
            }
        )

    return {
        "type": "vehicle_recommendation",
        "summary": f"已根据客户需求和库存匹配出 {len(cards)} 款推荐车型。",
        "demand": {
            key: _money(value) if isinstance(value, Decimal) else value
            for key, value in demand.items()
        },
        "cards": cards,
        "next_best_actions": [
            {"action": "book_test_drive", "label": "预约试驾", "priority": "high"},
            {"action": "generate_quote", "label": "生成报价草案", "priority": "high"},
        ],
    }


def generate_followup_script(*, customer_id: int | None = None, scenario: str = "first_contact") -> dict[str, Any]:
    customer = Customer.objects.filter(id=customer_id).select_related("demand_profile").first() if customer_id else None
    profile = getattr(customer, "demand_profile", None)
    name = customer.name if customer else "客户"
    model_hint = ""
    if profile and profile.preferred_models:
        model_hint = profile.preferred_models[0]

    if scenario == "test_drive":
        script = (
            f"{name}您好，{model_hint or '推荐车型'} 目前可以安排试驾。"
            "我可以先为您预留合适时段，并提前准备金融方案，方便您到店后直接对比。"
        )
    elif scenario == "price_objection":
        script = (
            f"{name}您好，我理解您比较关注价格。"
            "我可以把现金优惠、金融方案和置换支持放在一起算清楚，让您直观看到真实落地成本。"
        )
    else:
        script = (
            f"{name}您好，根据您的预算和用车需求，我筛选了几款当前库存里比较合适的车型。"
            "我可以先发您一份简短对比，再帮您安排试驾时间。"
        )

    return {
        "type": "followup_script",
        "scenario": scenario,
        "script": script,
        "talking_points": [
            "确认预算区间和购车周期。",
            "给出明确试驾时间段，推动预约。",
            "结合金融、保险和置换方案做落地价对比。",
        ],
        "next_best_action": {"action": "book_test_drive", "label": "预约试驾"},
    }


def suggest_quote(*, inventory_id: int, customer_id: int | None = None) -> dict[str, Any]:
    vehicle = VehicleInventory.objects.select_related("trim", "trim__model", "store").get(id=inventory_id)
    base_price = vehicle.negotiable_price or vehicle.listed_price or vehicle.trim.official_price or Decimal("0")
    policy = (
        SalesPolicy.objects.filter(store=vehicle.store, model=vehicle.trim.model, is_active=True)
        .order_by("-amount", "-created_at")
        .first()
    )
    discount = policy.amount if policy and policy.amount else Decimal("0")
    insurance = Decimal("5800.00")
    license_fee = Decimal("1200.00")
    accessory = Decimal("3000.00")
    landing_price = base_price - discount + insurance + license_fee + accessory
    down_payment = landing_price * Decimal("0.30")
    monthly_payment = (landing_price - down_payment) / Decimal("36")

    return {
        "type": "quote_suggestion",
        "customer_id": customer_id,
        "inventory_id": inventory_id,
        "vin": vehicle.vin,
        "bare_vehicle_price": _money(base_price),
        "discount_amount": _money(discount),
        "insurance_amount": _money(insurance),
        "license_fee": _money(license_fee),
        "accessory_amount": _money(accessory),
        "landing_price": _money(landing_price),
        "finance_down_payment": _money(down_payment),
        "finance_monthly_payment": _money(monthly_payment),
        "explanation": "该报价为草案，最终成交价、金融审批和保险报价需由门店确认。",
    }
