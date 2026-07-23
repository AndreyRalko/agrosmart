from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from personal.models import Person


class NotificationType(models.TextChoices):
    OPTIMAL_CONDITIONS = "optimal_conditions"


class NotificationSetting(models.Model):
    type = models.CharField(choices=NotificationType.choices, max_length=255, blank=False, null=False)
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="notification_settings")
    params = models.JSONField(default=dict, blank=False, null=False)
    every_minute = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(1)],
    )
    min_look_ahead_hours = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(0), MaxValueValidator(8)],
    )
    look_ahead_hours = models.PositiveIntegerField(
        default=6,
        validators=[MinValueValidator(1), MaxValueValidator(8)],
    )
    active_from_hour = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(23)],
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Notification(models.Model):
    class Status(models.TextChoices):
        SENT = "sent"
        RECEIVED = "received"
        READ = "read"

    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name="notifications")
    setting = models.ForeignKey(
        NotificationSetting,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(choices=NotificationType.choices, max_length=255, blank=False, null=False)
    status = models.CharField(choices=Status.choices, default=Status.SENT, max_length=255, blank=False, null=False)
    title = models.CharField(max_length=255, blank=False, null=False)
    msg = models.TextField(blank=False, null=False)
    payload = models.JSONField(default=dict, blank=False, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class NotificationAgroOpField(models.Model):
    notification = models.OneToOneField(
        Notification,
        on_delete=models.CASCADE,
        related_name="agro_op_field",
    )
    field_id = models.BigIntegerField()
    field_no = models.CharField(max_length=255)
    time = models.DateTimeField(default=timezone.now)
    checked_conditions = models.JSONField(default=list, blank=False, null=False)
    culture_variety_id = models.BigIntegerField()
    culture_variety_name = models.CharField(max_length=255, blank=False, null=False)
    operation_id = models.BigIntegerField()
    operation_name = models.CharField(max_length=255, blank=False, null=False)
