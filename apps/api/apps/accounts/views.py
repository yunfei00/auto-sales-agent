from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
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
    }


@ensure_csrf_cookie
@api_view(["GET"])
@permission_classes([AllowAny])
def current_session(request):
    return Response(_session_payload(request))


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )
    if user is None:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_400_BAD_REQUEST)
    if not user.is_active:
        return Response({"detail": "This account is inactive."}, status=status.HTTP_403_FORBIDDEN)

    login(request, user)
    return Response(_session_payload(request))


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request)
    return Response({"authenticated": False, "user": None})
