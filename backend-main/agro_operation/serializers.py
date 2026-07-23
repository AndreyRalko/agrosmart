from rest_framework import serializers

from core.serializer import TranslationSerializerReqLangMixinV2, TranslationSerializerMixin
from integration.serializers import IntegrationSerializerRead, IntegrationFieldSerializerRead
from .models import Operation, Field, Condition, AlertOperationToCulture
from .serializers_field import ConditionValuesField
from .validators import validate_condition_values


class ConditionSerializer(serializers.ModelSerializer):
    values = ConditionValuesField()

    def validate_values(self, value):
        return validate_condition_values(value)

    class Meta:
        model = Condition
        fields = ("id", "field", "values", "culture_variety")


class ConditionItemSerializer(serializers.Serializer):
    field = serializers.IntegerField(required=True)
    values = ConditionValuesField()

    def validate_values(self, value):
        return validate_condition_values(value)


class FieldSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    integration = IntegrationSerializerRead(read_only=True)
    integration_field = IntegrationFieldSerializerRead(read_only=True)

    class Meta:
        model = Field
        fields = ("id", "name", "type", "required", "operation", "integration", "integration_field", "integration_field")


class FieldSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    class Meta:
        model = Field
        fields = ("id", "name", "type", "required", "operation", "integration", "integration_field")

        extra_kwargs = {
            'type': {'required': True},
            'required': {'required': True},
        }


class OperationSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    fields = FieldSerializerRead(many=True, read_only=True, source="field_set")
    is_transportation = serializers.SerializerMethodField()

    def get_is_transportation(self, obj):
        return hasattr(obj, 'transportation_details')

    class Meta:
        model = Operation
        fields = ("id", "name", "fields", "is_transportation")

class OperationSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    class Meta:
        model = Operation
        fields = ("id", "name")


class ConditionSerializerShort(serializers.ModelSerializer):
    values = ConditionValuesField()

    class Meta:
        model = Condition
        fields = ("id", "values")


class FieldSerializerReadShort(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    conditions = ConditionSerializerShort(many=True, read_only=True, source="condition_set")
    integration = IntegrationSerializerRead(read_only=True)
    integration_field = IntegrationFieldSerializerRead(read_only=True)

    class Meta:
        model = Field
        fields = ("id", "name", "type", "required", "integration", "integration_field", "conditions")


class OperationByCultureVarietyShortSerializer(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    fields = FieldSerializerReadShort(many=True, read_only=True, source="field_set")

    class Meta:
        model = Operation
        fields = ("id", "name", "fields")


class OperationShortSerializer(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = Operation
        fields = ("id", "name")


class AlertOperationToCultureReadSerializer(serializers.ModelSerializer):
    from culture.serializers import CultureVarietySerializerReadShort
    culture_variety = CultureVarietySerializerReadShort()
    operation = OperationShortSerializer()

    class Meta:
        model = AlertOperationToCulture
        fields = ("id", "culture_variety", "operation", "code")