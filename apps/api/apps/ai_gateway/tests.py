from decimal import Decimal

from django.test import SimpleTestCase

from .services import _extract_budget


class BudgetExtractionTests(SimpleTestCase):
    def test_extracts_plain_numeric_range(self):
        self.assertEqual(
            _extract_budget("customer budget 200000 to 320000, wants SUV"),
            (Decimal("200000"), Decimal("320000")),
        )

    def test_extracts_chinese_ten_thousand_range(self):
        self.assertEqual(
            _extract_budget("\u9884\u7b9720-32\u4e07\uff0c\u5bb6\u7528SUV"),
            (Decimal("200000"), Decimal("320000")),
        )

    def test_extracts_w_unit_range(self):
        self.assertEqual(
            _extract_budget("budget 20w-32w family suv"),
            (Decimal("200000"), Decimal("320000")),
        )

    def test_single_budget_keeps_negotiation_band(self):
        self.assertEqual(
            _extract_budget("budget 200000 ev"),
            (Decimal("180000.0"), Decimal("220000.0")),
        )

    def test_returns_empty_budget_when_missing(self):
        self.assertEqual(_extract_budget("family suv"), (None, None))
