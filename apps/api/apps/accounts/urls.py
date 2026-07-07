from django.urls import path

from .views import current_session, login_view, logout_view

urlpatterns = [
    path("session/", current_session, name="current-session"),
    path("login/", login_view, name="account-login"),
    path("logout/", logout_view, name="account-logout"),
]
