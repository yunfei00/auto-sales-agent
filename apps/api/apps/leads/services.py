import csv
from decimal import Decimal, InvalidOperation
from io import StringIO

from django.db import transaction

from .models import Lead, LeadImportJob


FIELD_ALIASES = {
    "name": ("name", "customer", "customer_name", "姓名", "客户", "客户姓名"),
    "phone": ("phone", "mobile", "手机号", "电话", "联系电话", "手机"),
    "city": ("city", "城市", "地区"),
    "intent_model": ("intent_model", "model", "意向车型", "车型", "意向车系"),
    "budget_min": ("budget_min", "min_budget", "预算下限", "最低预算"),
    "budget_max": ("budget_max", "max_budget", "预算上限", "最高预算"),
    "purchase_timeline": ("purchase_timeline", "timeline", "购车周期", "购车时间"),
    "score": ("score", "评分", "线索分"),
    "notes": ("notes", "备注", "说明"),
}


def _value(row, field):
    for alias in FIELD_ALIASES[field]:
        if alias in row and str(row[alias]).strip():
            return str(row[alias]).strip()
    return ""


def _normalize_row(row):
    normalized = {}
    for key, value in row.items():
        normalized_key = str(key or "").strip().lstrip("\ufeff")
        normalized[normalized_key] = str(value or "").strip()
    return normalized


def _decimal(value):
    if not value:
        return None
    normalized = value.replace(",", "").replace("，", "").replace("万", "")
    try:
        amount = Decimal(normalized)
    except InvalidOperation:
        return None
    if "万" in value or amount < 1000:
        amount *= Decimal("10000")
    return amount


def _score(row):
    value = _value(row, "score")
    if value.isdigit():
        return max(0, min(100, int(value)))
    if _value(row, "intent_model") and _value(row, "phone"):
        return 72
    return 50


def _decode_upload(file_field):
    file_field.open("rb")
    raw = file_field.read()
    for encoding in ("utf-8-sig", "gb18030"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


@transaction.atomic
def import_leads_from_csv(job: LeadImportJob, *, store=None, assigned_to=None) -> LeadImportJob:
    if not job.file:
        job.status = LeadImportJob.Status.FAILED
        job.error_message = "请上传 CSV 文件。"
        job.save(update_fields=["status", "error_message", "updated_at"])
        return job

    try:
        content = _decode_upload(job.file)
        reader = csv.DictReader(StringIO(content))
        imported_rows = 0
        total_rows = 0
        errors: list[str] = []

        for row_number, row in enumerate(reader, start=2):
            row = _normalize_row(row)
            total_rows += 1
            phone = _value(row, "phone")
            if not phone:
                errors.append(f"第 {row_number} 行缺少手机号")
                continue

            budget_min = _decimal(_value(row, "budget_min"))
            budget_max = _decimal(_value(row, "budget_max"))
            score = _score(row)
            defaults = {
                "store": store,
                "source": job.source,
                "import_job": job,
                "assigned_to": assigned_to,
                "name": _value(row, "name"),
                "city": _value(row, "city"),
                "intent_model": _value(row, "intent_model"),
                "budget_min": budget_min,
                "budget_max": budget_max,
                "purchase_timeline": _value(row, "purchase_timeline"),
                "raw_payload": row,
                "ai_tags": ["csv_import", "valid_lead"],
                "score": score,
                "status": Lead.Status.QUALIFIED if score >= 60 else Lead.Status.NEW,
                "notes": _value(row, "notes"),
            }
            Lead.objects.update_or_create(tenant=job.tenant, phone=phone, defaults=defaults)
            imported_rows += 1

        job.total_rows = total_rows
        job.imported_rows = imported_rows
        job.status = LeadImportJob.Status.COMPLETED if not errors else LeadImportJob.Status.FAILED
        job.error_message = "\n".join(errors[:20])
        job.save(update_fields=["total_rows", "imported_rows", "status", "error_message", "updated_at"])
    except Exception as exc:  # pragma: no cover - defensive guard for malformed uploads
        job.status = LeadImportJob.Status.FAILED
        job.error_message = str(exc)
        job.save(update_fields=["status", "error_message", "updated_at"])
    return job
