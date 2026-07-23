import json

from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django_celery_beat.models import IntervalSchedule, PeriodicTask

from .models import NotificationSetting


def create_or_update_schedule(setting: NotificationSetting):
    if not setting.is_active:
        PeriodicTask.objects.filter(name=f"notification-setting-{setting.id}").delete()
        return

    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=setting.every_minute,
        period=IntervalSchedule.MINUTES,
    )

    PeriodicTask.objects.update_or_create(
        name=f"notification-setting-{setting.id}",
        defaults={
            "interval": schedule,
            "task": "notification.tasks.run_notification_setting_check",
            "args": json.dumps([setting.id]),
            "enabled": setting.is_active,
        },
    )


@receiver(post_save, sender=NotificationSetting)
def notification_setting_saved(sender, instance, **kwargs):
    create_or_update_schedule(instance)


@receiver(post_delete, sender=NotificationSetting)
def notification_setting_deleted(sender, instance, **kwargs):
    PeriodicTask.objects.filter(name=f"notification-setting-{instance.id}").delete()
