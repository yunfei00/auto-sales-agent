from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AIConversation, AIMessage, AIToolCall
from .serializers import (
    AIConversationSerializer,
    AIToolCallSerializer,
    ChatRequestSerializer,
    FollowupScriptRequestSerializer,
    QuoteSuggestionRequestSerializer,
    VehicleRecommendationRequestSerializer,
)
from .services import generate_followup_script, recommend_vehicles, suggest_quote


class AIConversationViewSet(viewsets.ModelViewSet):
    queryset = AIConversation.objects.prefetch_related("messages").all()
    serializer_class = AIConversationSerializer
    filterset_fields = ("context_type", "context_id", "user")
    search_fields = ("title", "context_type", "context_id")
    ordering_fields = ("created_at", "updated_at")

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AIToolCallViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIToolCall.objects.select_related("message", "message__conversation").all()
    serializer_class = AIToolCallSerializer
    filterset_fields = ("tool_name", "success")
    search_fields = ("tool_name", "error_message")
    ordering_fields = ("created_at", "duration_ms")

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_superuser:
            return queryset
        return queryset.filter(message__conversation__user=self.request.user)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat(request):
    serializer = ChatRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    message = serializer.validated_data["message"]
    conversation = None

    if serializer.validated_data.get("conversation_id"):
        conversations = AIConversation.objects.all()
        if not request.user.is_superuser:
            conversations = conversations.filter(user=request.user)
        conversation = conversations.filter(id=serializer.validated_data["conversation_id"]).first()

    if conversation is None:
        title = message[:80]
        conversation = AIConversation.objects.create(
            user=request.user,
            title=title,
            context_type=serializer.validated_data.get("context_type", ""),
            context_id=serializer.validated_data.get("context_id", ""),
        )

    AIMessage.objects.create(conversation=conversation, role=AIMessage.Role.USER, content=message)

    lower = message.lower()
    recommendation_keywords = (
        "recommend",
        "vehicle",
        "car",
        "suv",
        "ev",
        "\u63a8\u8350",
        "\u6c7d\u8f66",
        "\u65b0\u80fd\u6e90",
    )
    if any(keyword in lower for keyword in recommendation_keywords):
        response_payload = recommend_vehicles(message=message)
    else:
        response_payload = {
            "type": "assistant_message",
            "summary": "AI 网关已连接。可以使用车型推荐、跟进话术或报价草案能力。",
            "echo": message,
            "next_actions": [
                {"action": "vehicle_recommendation", "label": "生成车型推荐"},
                {"action": "followup_script", "label": "生成跟进话术"},
            ],
        }
    assistant = AIMessage.objects.create(
        conversation=conversation,
        role=AIMessage.Role.ASSISTANT,
        content=response_payload["summary"],
        structured_payload=response_payload,
    )

    return Response(
        {
            "conversation_id": conversation.id,
            "message_id": assistant.id,
            "result": response_payload,
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def vehicle_recommendations(request):
    serializer = VehicleRecommendationRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = recommend_vehicles(**serializer.validated_data)
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def followup_script(request):
    serializer = FollowupScriptRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = generate_followup_script(**serializer.validated_data)
    return Response(result, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def quote_suggestion(request):
    serializer = QuoteSuggestionRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    result = suggest_quote(**serializer.validated_data)
    return Response(result, status=status.HTTP_200_OK)

# Create your views here.
