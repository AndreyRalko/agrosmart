from rest_framework import serializers
from core.serializer import TranslationSerializerReqLangMixinV2, TranslationSerializerMixin
from field.models import Field
from .models import Integration, IntegrationLog, IntegrationTemperatureField, IntegrationField, IntegrationDataField

class IntegrationFieldSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = IntegrationField
        fields = ("id", "name", "field_name")

class IntegrationSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    fields = IntegrationFieldSerializerRead(many=True, read_only=True)

    class Meta:
        model = Integration
        fields = (
            "id",
            "name",
            "icon",
            "api",
            "params_hard",
            "body_hard",
            "headers_hard",
            "every_minute",
            "type",
            "type_display",
            "fields"
        )


class IntegrationSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    class Meta:
        model = Integration
        fields = (
            "id",
            "name",
            "icon",
            "api",
            "params_hard",
            "body_hard",
            "headers_hard",
            "every_minute",
            "type",
        )
        extra_kwargs = {
            "type": {"default": Integration.IntegrationType.FIELD},
            "every_minute": {"required": False},
        }

class IntegrationLogSerializerRead(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = IntegrationLog
        fields = (
            "id",
            "integration",
            "status",
            "status_display",
            "error_type",
            "http_status",
            "error",
            "result",
            "created_at",
        )
        read_only_fields = fields


class IntegrationTemperatureFieldSerializerRead(serializers.ModelSerializer):
    from field.serializers import FieldSerializerShort
    field = FieldSerializerShort(read_only=True)

    class Meta:
        model = IntegrationTemperatureField
        fields = (
            "id",
            "integration",
            "field",
            "integration_log",
            "time",
            "temperature_c",
            "humidity_percent",
            "wind_speed_m_s",
            "pressure_hpa",
            "precipitation_probability_percent",
            "precipitation_intensity_mm_hr",
        )
        read_only_fields = fields

class IntegrationDataFieldSerializerRead(serializers.ModelSerializer):
    from field.serializers import FieldSerializerShort
    field = FieldSerializerShort(read_only=True)

    class Meta:
        model = IntegrationDataField
        fields = (
            "id",
            "integration",
            "field",
            "integration_log",
            "time",
            "data",
        )
        read_only_fields = fields

class IntegrationTemperatureFieldLastQuerySerializer(serializers.Serializer):
    integration_id = serializers.PrimaryKeyRelatedField(queryset=Integration.objects, required=True)
    field_id = serializers.PrimaryKeyRelatedField(queryset=Field.objects, required=True)
    dt = serializers.DateTimeField(required=True)

class IntegrationDataFieldLastQuerySerializer(serializers.Serializer):
    integration_id = serializers.PrimaryKeyRelatedField(queryset=Integration.objects, required=True)
    field_id = serializers.PrimaryKeyRelatedField(queryset=Field.objects, required=True)
    dt = serializers.DateTimeField(required=True)