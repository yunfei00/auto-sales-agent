import logging

from django.core.management.base import BaseCommand, CommandError

from apps.customers.models import Customer
from apps.customers.services.customer_scoring import recalculate_customer_levels_batch


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Recalculate deterministic customer scores and levels."

    def add_arguments(self, parser):
        parser.add_argument(
            "--customer-id",
            type=int,
            help="Only recalculate this customer.",
        )
        parser.add_argument(
            "--tenant-id",
            type=int,
            help="Only recalculate customers in this tenant.",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=200,
            help="Database iterator chunk size (default: 200).",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size <= 0:
            raise CommandError("--batch-size must be greater than zero.")

        selected = Customer.objects.order_by("pk")
        if options.get("customer_id") is not None:
            selected = selected.filter(pk=options["customer_id"])
        if options.get("tenant_id") is not None:
            selected = selected.filter(tenant_id=options["tenant_id"])

        skipped = selected.filter(level_status=Customer.LevelStatus.CLOSED).count()
        customer_ids = selected.exclude(level_status=Customer.LevelStatus.CLOSED).values_list("pk", flat=True)
        success = 0
        failed = 0

        pending_ids: list[int] = []
        for customer_id in customer_ids.iterator(chunk_size=batch_size):
            pending_ids.append(customer_id)
            if len(pending_ids) >= batch_size:
                succeeded, failed_count = self._process_batch(pending_ids)
                success += succeeded
                failed += failed_count
                pending_ids = []

        if pending_ids:
            succeeded, failed_count = self._process_batch(pending_ids)
            success += succeeded
            failed += failed_count

        summary = f"success={success} skipped={skipped} failed={failed}"
        if failed:
            self.stdout.write(self.style.WARNING(summary))
        else:
            self.stdout.write(self.style.SUCCESS(summary))

    def _process_batch(self, customer_ids: list[int]) -> tuple[int, int]:
        try:
            outcomes = recalculate_customer_levels_batch(
                customer_ids,
                trigger="management_command",
            )
        except Exception as exc:
            outcomes = {customer_id: (None, exc) for customer_id in customer_ids}
        success = 0
        failed = 0
        for customer_id in customer_ids:
            _result, error = outcomes.get(customer_id, (None, RuntimeError("Customer was not processed.")))
            if error is None:
                success += 1
                continue
            failed += 1
            logger.error(
                "Customer level recalculation failed for customer_id=%s",
                customer_id,
                exc_info=(type(error), error, error.__traceback__),
            )
            self.stderr.write(self.style.ERROR(f"customer_id={customer_id} failed: {error}"))
        return success, failed
