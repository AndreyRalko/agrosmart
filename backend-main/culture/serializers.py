from rest_framework import serializers
from rest_framework.fields import SerializerMethodField
from django.utils.translation import gettext_lazy as _

from core.serializer import TranslationSerializerReqLangMixinV2, \
    TranslationSerializerMixin
from .models import Culture, CultureVariety
from .sql import get_unique_cnt
from drf_spectacular.utils import extend_schema_field


class TotalUniqueOpSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    cnt = serializers.IntegerField()


class CultureVarietySerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    op_cnt = SerializerMethodField()

    @extend_schema_field(field=TotalUniqueOpSerializer)
    def get_op_cnt(self, obj):
        return get_unique_cnt(self.context.get("ids"))

    class Meta:
        model = CultureVariety
        fields = ("id", "name", "op_cnt", "options")


class CultureVarietySerializerReadShort(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = CultureVariety
        fields = ("id", "name",)


class CultureVarietySerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    def validate_options(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError(_("Expected an object."))

        allowed_keys = {
            option_key
            for name, option_key in vars(CultureVariety.OptionKeys).items()
            if not name.startswith("_") and isinstance(option_key, str)
        }
        unknown_keys = sorted(set(value.keys()) - allowed_keys)
        if unknown_keys:
            raise serializers.ValidationError({
                "unknown_keys": _(
                    "Unknown option keys: %(keys)s"
                ) % {"keys": ", ".join(unknown_keys)},
            })

        npk_removal_key = CultureVariety.OptionKeys.npk_removal
        if npk_removal_key in value:
            self.validate_npk_removal(value[npk_removal_key])

        return value

    def validate_npk_removal(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError({
                CultureVariety.OptionKeys.npk_removal: _("Expected an object."),
            })

        allowed_keys = {
            option_key
            for name, option_key in vars(CultureVariety.NpkRemovalKeys).items()
            if not name.startswith("_") and isinstance(option_key, str)
        }
        unknown_keys = sorted(set(value.keys()) - allowed_keys)
        if unknown_keys:
            raise serializers.ValidationError({
                CultureVariety.OptionKeys.npk_removal: {
                    "unknown_keys": _(
                        "Unknown NPK removal keys: %(keys)s"
                    ) % {"keys": ", ".join(unknown_keys)},
                },
            })

        missing_keys = sorted(allowed_keys - set(value.keys()))
        if missing_keys:
            raise serializers.ValidationError({
                CultureVariety.OptionKeys.npk_removal: {
                    "missing_keys": _(
                        "Missing NPK removal keys: %(keys)s"
                    ) % {"keys": ", ".join(missing_keys)},
                },
            })

        errors = {}
        for key in sorted(allowed_keys):
            if not isinstance(value[key], (int, float)):
                errors[key] = _("Expected a float.")
        if errors:
            raise serializers.ValidationError({
                CultureVariety.OptionKeys.npk_removal: errors,
            })

        return value

    class Meta:
        model = CultureVariety
        fields = ("id", "name", "culture", "options")


class CultureSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    varieties = CultureVarietySerializerReadShort(many=True, read_only=True)

    class Meta:
        model = Culture
        fields = ("id", "name", "varieties")


class CultureSerializerWrite(TranslationSerializerMixin, serializers.ModelSerializer):
    required_translation_fields = {"name": True}

    class Meta:
        model = Culture
        fields = ("id", "name")


class CultureVarietyCustomByCultureRequestSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=True)


class CultureVarietySerializerShort(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    from agro_operation.serializers import OperationShortSerializer

    operations = serializers.SerializerMethodField()

    @extend_schema_field(field=OperationShortSerializer)
    def get_operations(self, obj):
        ops_map = {}
        for cond in obj.condition_set.all():
            op = cond.field.operation
            ops_map[op.id] = op

        return self.OperationShortSerializer(ops_map.values(), many=True).data


    class Meta:
        model = CultureVariety
        fields = ("id", "name", "operations")


class CultureVarietyCustomByCultureResponseSerializer(serializers.Serializer):
    results = CultureVarietySerializerShort(many=True)
