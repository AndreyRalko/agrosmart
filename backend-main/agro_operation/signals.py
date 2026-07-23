from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Field
from .services.alert_operation_to_culture import remove_alert_if_fixed, insert_alert_if_not_fixed


@receiver(post_save, sender=Field)
def on_other_saved(sender, instance, created, **kwargs):
    remove_alert_if_fixed(instance.operation_id)
    insert_alert_if_not_fixed(instance.operation_id)


@receiver(post_delete, sender=Field)
def on_other_deleted(sender, instance, **kwargs):
    remove_alert_if_fixed(instance.operation_id)
