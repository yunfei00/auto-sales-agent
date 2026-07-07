import base64
import json
import secrets

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

CAPTCHA_SESSION_KEY = "account_login_captcha"
CAPTCHA_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _session_payload(request):
    user = request.user if request.user.is_authenticated else None
    return {
        "authenticated": bool(user),
        "user": CurrentUserSerializer(user).data if user else None,
        "csrf_token": get_token(request),
    }


def _randint(max_value: int) -> int:
    return secrets.randbelow(max_value)


def _captcha_svg(code: str) -> str:
    width = 148
    height = 48
    lines = []
    for _ in range(5):
        x1, y1, x2, y2 = _randint(width), _randint(height), _randint(width), _randint(height)
        color = f"rgba({160 + _randint(70)}, {70 + _randint(120)}, {190 + _randint(55)}, 0.35)"
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" stroke-width="1.4"/>')

    letters = []
    for index, char in enumerate(code):
        x = 22 + index * 28 + _randint(7)
        y = 31 + _randint(7)
        rotate = _randint(25) - 12
        color = f"rgb({75 + _randint(85)}, {28 + _randint(60)}, {135 + _randint(80)})"
        letters.append(
            f'<text x="{x}" y="{y}" transform="rotate({rotate} {x} {y})" '
            f'font-family="Inter, Arial, sans-serif" font-size="24" font-weight="800" fill="{color}">{char}</text>'
        )

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        '<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">'
        '<stop stop-color="#f7d7ff"/><stop offset="1" stop-color="#d9ecff"/></linearGradient></defs>'
        '<rect width="148" height="48" rx="13" fill="url(#bg)"/>'
        f'{"".join(lines)}{"".join(letters)}'
        '</svg>'
    )


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def login_captcha(request):
    code = "".join(secrets.choice(CAPTCHA_CHARS) for _ in range(4))
    request.session[CAPTCHA_SESSION_KEY] = code.lower()
    request.session.modified = True
    svg = _captcha_svg(code)
    encoded = base64.b64encode(svg.encode("utf-8")).decode("ascii")
    return Response(
        {
            "captcha_image": f"data:image/svg+xml;base64,{encoded}",
            "length": len(code),
            "csrf_token": get_token(request),
        }
    )


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

    expected_captcha = request.session.pop(CAPTCHA_SESSION_KEY, "")
    request.session.modified = True
    submitted_captcha = serializer.validated_data["captcha"].strip().lower()
    if not expected_captcha or submitted_captcha != expected_captcha:
        return JsonResponse({"captcha": ["Invalid or expired verification code."]}, status=status.HTTP_400_BAD_REQUEST)

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
