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
