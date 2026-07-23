import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django_celery_beat.models import PeriodicTask, IntervalSchedule

from .models import Integration
from .field_defaults import sync_integration_fields


def create_or_update_schedule(integration):
    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=integration.every_minute,
        period=IntervalSchedule.MINUTES,
    )

    PeriodicTask.objects.update_or_create(
        name=f"integration-{integration.id}",
        defaults={
            "interval": schedule,
            "task": "integration.tasks.run_integration_for_all_fields",
            "args": json.dumps([integration.id]),
        },
    )


@receiver(post_save, sender=Integration)
def integration_saved(sender, instance, **kwargs):
    sync_integration_fields(instance)
    create_or_update_schedule(instance)


@receiver(post_delete, sender=Integration)
def integration_deleted(sender, instance, **kwargs):
    PeriodicTask.objects.filter(
        name=f"integration-{instance.id}"
    ).delete()
