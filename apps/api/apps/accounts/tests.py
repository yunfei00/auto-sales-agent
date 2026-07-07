from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse

from apps.accounts.models import UserProfile


class SessionApiTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="consultant",
            password="Passw0rd!234",
            email="consultant@example.com",
        )
        UserProfile.objects.create(user=self.user, role=UserProfile.Role.SALES_CONSULTANT)

    def test_session_starts_anonymous(self):
        response = self.client.get(reverse("current-session"))

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])
        self.assertTrue(response.json()["csrf_token"])

    def test_login_and_logout(self):
        response = self.client.post(
            reverse("account-login"),
            {"username": "consultant", "password": "Passw0rd!234"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["authenticated"])
        self.assertEqual(payload["user"]["profile"]["role"], UserProfile.Role.SALES_CONSULTANT)
        self.assertTrue(payload["csrf_token"])

        response = self.client.post(reverse("account-logout"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])

    def test_login_requires_csrf_when_csrf_checks_are_enforced(self):
        secure_client = Client(enforce_csrf_checks=True)
        login_payload = {"username": "consultant", "password": "Passw0rd!234"}

        response = secure_client.post(
            reverse("account-login"),
            login_payload,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

        session_response = secure_client.get(reverse("current-session"))
        csrf_token = session_response.json()["csrf_token"]
        response = secure_client.post(
            reverse("account-login"),
            login_payload,
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, 200)
        csrf_token = response.json()["csrf_token"]

        response = secure_client.post(
            reverse("account-logout"),
            {},
            content_type="application/json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, 200)

    def test_anonymous_business_api_read_is_denied(self):
        response = self.client.get("/api/leads/")

        self.assertEqual(response.status_code, 403)
