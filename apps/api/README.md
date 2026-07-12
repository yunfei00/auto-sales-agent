# Auto Sales Agent API

Django backend for the automotive sales agent.

## Local Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:7860
```

Seed demo data:

```bash
python manage.py seed_demo
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:7860
```

## Useful URLs

- Health check: `http://localhost:7860/`
- Admin: `http://localhost:7860/admin/`
- API root examples:
  - `http://localhost:7860/api/customers/`
  - `http://localhost:7860/api/vehicles/inventory/`
  - `http://localhost:7860/api/sales/orders/`
  - `http://localhost:7860/api/ai/chat/`

## AI Gateway Endpoints

```text
POST /api/ai/chat/
POST /api/ai/recommendations/vehicles/
POST /api/ai/followups/generate/
POST /api/ai/quotes/suggest/
```

Example vehicle recommendation payload:

```json
{
  "message": "budget 200000 ev suv",
  "limit": 3
}
```

Example follow-up script payload:

```json
{
  "customer_id": 1,
  "scenario": "test_drive"
}
```

Example quote suggestion payload:

```json
{
  "inventory_id": 1,
  "customer_id": 1
}
```

## Dynamic Customer Scoring V1

Customer levels are calculated by deterministic V1 rules. The scoring engine does
not call an AI model, and it does not overwrite the separate `deal_probability`
field.

- Scoring implementation: `apps/customers/services/customer_scoring.py`
- Current score and level fields: `apps/customers/models.py` (`Customer`)
- Level change audit trail: `apps/customers/models.py` (`CustomerLevelHistory`)
- Business rules: `../../docs/customer-level-scoring-rules.md`

The Customer and Sales API create/update flows explicitly trigger recalculation
after structured changes to a customer, demand profile, interaction, test drive,
quote, or order. Direct ORM or bulk writes must call the scoring service or run the
calibration command below. The stored score is returned by the Customer API;
opening a page does not invoke an AI model or calculate a new score. Closed
customers retain their last score and are excluded from ordinary active-level
recalculation.

Run a full recalculation for every non-closed customer (including customers whose
level status is pending):

```bash
python manage.py recalculate_customer_levels
```

The command can target one customer, one tenant, or the intersection of both. It
uses a database iterator and continues if an individual customer fails:

```bash
python manage.py recalculate_customer_levels --customer-id 42
python manage.py recalculate_customer_levels --tenant-id 7 --batch-size 500
python manage.py recalculate_customer_levels --customer-id 42 --tenant-id 7
```

No scheduler is configured by this project. Deployments may invoke this command
from their existing scheduler when periodic time-based calibration is required.

Missing structured data receives zero points and is identified as `missing_data`
in `score_breakdown`; the scorer does not infer facts from arbitrary keywords.
Current model gaps include loan qualification and an acceptable monthly-payment
range, trade-in vehicle details, purchase/license eligibility, the final decision
maker and family consensus, the decisive purchase condition, a verified purchase
or registration city, the active 25-point negotiation stage, contact outcome and
interaction-effectiveness flags, and explicit risk flags for a postponed purchase
or a locked competitor. Quote send time and test-drive completion time are captured
as explicit audit timestamps when their API status transitions occur; existing
records without those timestamps receive no time-based risk deduction. Free-text
purchase timelines are scored only when they match a supported, unambiguous
interval. Budget matching requires a reliable linked quote or same-tenant vehicle
price.
