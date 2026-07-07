import json

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_POST
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import CurrentUserSerializer, LoginSerializer


def _session_payload(request):
    user = request.user if request.user.is_authenticated else None
    return {
        "authenticated": bool(user),
        "user": CurrentUserSerializer(user).data if user else None,
        "csrf_token": get_token(request),
    }


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def current_session(request):
    return Response(_session_payload(request))


@csrf_protect
@require_POST
def login_view(request):
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "Invalid JSON payload."}, status=status.HTTP_400_BAD_REQUEST)

    serializer = LoginSerializer(data=payload)
    if not serializer.is_valid():
        return JsonResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return JsonResponse({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    if not user.is_active:
        return JsonResponse({"detail": "This account is inactive."}, status=status.HTTP_403_FORBIDDEN)

    login(request, user)
    return JsonResponse(_session_payload(request))


@csrf_protect
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"authenticated": False, "user": None})
