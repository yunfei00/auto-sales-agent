from pathlib import Path
from tempfile import TemporaryDirectory

from django.test import SimpleTestCase, override_settings


class FrontendRoutingTests(SimpleTestCase):
    def test_root_does_not_expose_frontend_entry(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 404)
        self.assertNotIn("Location", response)

    def test_car_entry_serves_frontend_index(self):
        with TemporaryDirectory() as tmpdir:
            frontend_dir = Path(tmpdir)
            (frontend_dir / "index.html").write_text("<!doctype html><title>car</title>", encoding="utf-8")

            with override_settings(FRONTEND_DIST_DIR=frontend_dir):
                response = self.client.get("/car")
                slash_response = self.client.get("/car/")
                response.close()
                slash_response.close()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/html")
        self.assertEqual(slash_response.status_code, 200)
        self.assertEqual(slash_response["Content-Type"], "text/html")
