from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from agro_operation.models import Operation
from core.serializer import TranslationSerializerReqLangMixinV2
from culture.models import CultureVariety
from field.models import Field
from personal.permissions_service import get_user_person

from .models import Notification, NotificationAgroOpField, NotificationSetting, NotificationType


class NotificationSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSetting
        fields = (
            "id",
            "type",
            "params",
            "every_minute",
            "min_look_ahead_hours",
            "look_ahead_hours",
            "active_from_hour",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        attrs = super().validate(attrs)

        notification_type = attrs.get("type", getattr(self.instance, "type", None))
        params = attrs.get("params", getattr(self.instance, "params", {}))
        person = getattr(self.instance, "person", None)
        if person is None and "request" in self.context:
            person = get_user_person(self.context["request"].user)
        if person is None:
            raise serializers.ValidationError("У пользователя нет карточки сотрудника")
        min_look_ahead_hours = attrs.get(
            "min_look_ahead_hours",
            getattr(self.instance, "min_look_ahead_hours", 0),
        )
        look_ahead_hours = attrs.get(
            "look_ahead_hours",
            getattr(self.instance, "look_ahead_hours", 0),
        )

        if min_look_ahead_hours > look_ahead_hours:
            raise serializers.ValidationError(
                {"min_look_ahead_hours": _("Minimum look ahead hours cannot exceed maximum look ahead hours")}
            )

        if notification_type == NotificationType.OPTIMAL_CONDITIONS:
            required_keys = {"field_id", "culture_variety_id", "operation_id"}
            missing_keys = sorted(required_keys - set(params.keys()))
            if missing_keys:
                raise serializers.ValidationError(
                    {"params": _("Missing required params: %(keys)s") % {"keys": ", ".join(missing_keys)}}
                )

            if not Field.objects.filter(id=params["field_id"]).exists():
                raise serializers.ValidationError({"params": _("Unknown field_id")})
            if not CultureVariety.objects.filter(id=params["culture_variety_id"]).exists():
                raise serializers.ValidationError({"params": _("Unknown culture_variety_id")})
            if not Operation.objects.filter(id=params["operation_id"]).exists():
                raise serializers.ValidationError({"params": _("Unknown operation_id")})

        duplicate_qs = NotificationSetting.objects.filter(
            person=person,
            type=notification_type,
            params=params,
        )
        if self.instance is not None:
            duplicate_qs = duplicate_qs.exclude(id=self.instance.id)
        if duplicate_qs.exists():
            raise serializers.ValidationError({"params": _("Duplicate notification setting")})

        return attrs


class NotificationAgroOpFieldSerializer(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = NotificationAgroOpField
        fields = (
            "id",
            "field_id",
            "field_no",
            "time",
            "checked_conditions",
            "culture_variety_id",
            "culture_variety_name",
            "operation_id",
            "operation_name",
        )
        read_only_fields = fields


class NotificationSerializer(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    context_data = NotificationAgroOpFieldSerializer(
        read_only=True,
        source="agro_op_field",
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "setting",
            "type",
            "status",
            "title",
            "msg",
            "payload",
            "context_data",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class NotificationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("status",)
