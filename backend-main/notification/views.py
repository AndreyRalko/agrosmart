from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from core.drf_permissions import ModulePermission

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
        return (
            NotificationSetting.objects.select_related("person")
            .filter(person=self.request.user.person)
            .order_by("id")
        )

    def perform_create(self, serializer):
        setting = serializer.save(person=self.request.user.person)
        run_notification_setting_check.delay(setting.id)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    module_key = "notification"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        return (
            Notification.objects.select_related("setting", "agro_op_field")
            .filter(person=self.request.user.person)
            .order_by("-created_at", "-id")
        )


class NotificationStatusViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationStatusSerializer
    http_method_names = ["patch"]
    module_key = "notification"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_queryset(self):
        return Notification.objects.filter(person=self.request.user.person).order_by("-created_at", "-id")
