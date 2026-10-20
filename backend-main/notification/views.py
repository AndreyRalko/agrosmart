from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from core.drf_permissions import ModulePermission
from personal.permissions_service import get_user_person

from .models import Notification, NotificationSetting
from .serializers import (
    NotificationSerializer,
    NotificationSettingSerializer,
    NotificationStatusSerializer,
)
from .tasks import run_notification_setting_check


class NotificationSettingViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSettingSerializer
    module_key = "notification"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        person = get_user_person(self.request.user)
        if person is None:
            return NotificationSetting.objects.none()
        return (
            NotificationSetting.objects.select_related("person")
            .filter(person=person)
            .order_by("id")
        )

    def perform_create(self, serializer):
        person = get_user_person(self.request.user)
        if person is None:
            raise ValidationError({"detail": "У пользователя нет карточки сотрудника"})
        setting = serializer.save(person=person)
        run_notification_setting_check.delay(setting.id)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    module_key = "notification"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        person = get_user_person(self.request.user)
        if person is None:
            return Notification.objects.none()
        return (
            Notification.objects.select_related("setting", "agro_op_field")
            .filter(person=person)
            .order_by("-created_at", "-id")
        )


class NotificationStatusViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationStatusSerializer
    http_method_names = ["patch"]
    module_key = "notification"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        person = get_user_person(self.request.user)
        if person is None:
            return Notification.objects.none()
        return Notification.objects.filter(person=person).order_by("-created_at", "-id")
