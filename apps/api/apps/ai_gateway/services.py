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


def _extract_budget(message: str) -> tuple[Decimal | None, Decimal | None]:
    numbers = [Decimal(match) for match in re.findall(r"\d+(?:\.\d+)?", message)]
    if not numbers:
        return None, None
    primary = numbers[0]
    if primary < Decimal("1000"):
        primary *= TEN_THOUSAND
    return primary * Decimal("0.9"), primary * Decimal("1.1")


def _demand_from_message(message: str) -> dict[str, Any]:
    lower = message.lower()
    budget_min, budget_max = _extract_budget(message)
    energy_type = ""
    if "bev" in lower or "ev" in lower or "electric" in lower or "\u65b0\u80fd\u6e90" in lower:
        energy_type = "bev"
    body_type = "SUV" if "suv" in lower else ""
    return {
        "budget_min": budget_min,
        "budget_max": budget_max,
        "energy_type": energy_type,
        "body_type": body_type,
        "usage_scenario": "family use" if "family" in lower else "",
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
            reasons.append("Price fits the stated budget range.")
        elif price <= budget_max * Decimal("1.08"):
            score += 10
            reasons.append("Slightly above budget, but can be discussed with policy support.")
        else:
            risks.append("Price may exceed the customer budget.")

    body_type = (demand.get("body_type") or "").lower()
    if body_type and model.body_type.lower() == body_type:
        score += 15
        reasons.append(f"Body type matches: {model.body_type}.")

    energy_type = demand.get("energy_type")
    if energy_type and model.energy_type == energy_type:
        score += 15
        reasons.append("Energy type matches the customer preference.")

    if vehicle.status == VehicleInventory.Status.AVAILABLE:
        score += 8
        reasons.append("In stock and available for delivery.")
    elif vehicle.status == VehicleInventory.Status.IN_TRANSIT:
        risks.append("Vehicle is in transit, delivery date needs confirmation.")
    else:
        risks.append(f"Inventory status is {vehicle.status}.")

    policy = (
        SalesPolicy.objects.filter(store=vehicle.store, model=model, is_active=True)
        .order_by("-amount", "-created_at")
        .first()
    )
    if policy:
        score += 7
        reasons.append(f"Active policy available: {policy.title}.")

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
                "reasons": reasons or ["Good overall fit based on current inventory."],
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
        "summary": f"Found {len(cards)} recommended vehicles based on demand and inventory.",
        "demand": {
            key: _money(value) if isinstance(value, Decimal) else value
            for key, value in demand.items()
        },
        "cards": cards,
        "next_best_actions": [
            {"action": "book_test_drive", "label": "Book a test drive", "priority": "high"},
            {"action": "generate_quote", "label": "Generate quote draft", "priority": "high"},
        ],
    }


def generate_followup_script(*, customer_id: int | None = None, scenario: str = "first_contact") -> dict[str, Any]:
    customer = Customer.objects.filter(id=customer_id).select_related("demand_profile").first() if customer_id else None
    profile = getattr(customer, "demand_profile", None)
    name = customer.name if customer else "there"
    model_hint = ""
    if profile and profile.preferred_models:
        model_hint = profile.preferred_models[0]

    if scenario == "test_drive":
        script = (
            f"Hi {name}, the {model_hint or 'recommended model'} is available for a weekend test drive. "
            "I can reserve a slot and prepare a finance plan before you arrive."
        )
    elif scenario == "price_objection":
        script = (
            f"Hi {name}, I understand price is important. I can compare the cash discount, finance plan, "
            "and trade-in support so you can see the real landing cost clearly."
        )
    else:
        script = (
            f"Hi {name}, based on your budget and usage needs, I found a few suitable vehicles in stock. "
            "Would you like me to send a short comparison and arrange a test drive?"
        )

    return {
        "type": "followup_script",
        "scenario": scenario,
        "script": script,
        "talking_points": [
            "Confirm budget and purchase timeline.",
            "Invite test drive with a specific time slot.",
            "Offer quote comparison with finance and trade-in options.",
        ],
        "next_best_action": {"action": "book_test_drive", "label": "Book test drive"},
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
        "explanation": "Draft only. Final price, finance approval and insurance quote must be confirmed by the store.",
    }
