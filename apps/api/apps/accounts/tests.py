from django.contrib.auth import get_user_model
from django.test import TestCase
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

        response = self.client.post(reverse("account-logout"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["authenticated"])
