import time

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Wait until the configured database accepts connections."

    def add_arguments(self, parser):
        parser.add_argument("--database", default="default")
        parser.add_argument("--timeout", type=int, default=90)
        parser.add_argument("--interval", type=float, default=2.0)

    def handle(self, *args, **options):
        database = options["database"]
        timeout = options["timeout"]
        interval = options["interval"]
        deadline = time.monotonic() + timeout
        last_error = None

        self.stdout.write(f"Waiting for database '{database}'...")

        while time.monotonic() < deadline:
            try:
                connections[database].ensure_connection()
            except OperationalError as exc:
                last_error = exc
                time.sleep(interval)
            else:
                self.stdout.write(self.style.SUCCESS(f"Database '{database}' is available."))
                return

        raise CommandError(f"Database '{database}' did not become available within {timeout}s: {last_error}")
