from rest_framework import serializers

from .models import AIConversation, AIMessage, AIToolCall


class AIConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIConversation
        fields = "__all__"
        read_only_fields = ("user",)


class AIMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIMessage
        fields = "__all__"


class AIToolCallSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIToolCall
        fields = "__all__"


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField()
    conversation_id = serializers.IntegerField(required=False)
    context_type = serializers.CharField(required=False, allow_blank=True)
    context_id = serializers.CharField(required=False, allow_blank=True)


class VehicleRecommendationRequestSerializer(serializers.Serializer):
    message = serializers.CharField(required=False, allow_blank=True)
    customer_id = serializers.IntegerField(required=False)
    store_id = serializers.IntegerField(required=False)
    limit = serializers.IntegerField(required=False, min_value=1, max_value=10, default=3)


class FollowupScriptRequestSerializer(serializers.Serializer):
    customer_id = serializers.IntegerField(required=False)
    scenario = serializers.ChoiceField(
        choices=("first_contact", "test_drive", "price_objection"),
        required=False,
        default="first_contact",
    )


class QuoteSuggestionRequestSerializer(serializers.Serializer):
    inventory_id = serializers.IntegerField()
    customer_id = serializers.IntegerField(required=False)
