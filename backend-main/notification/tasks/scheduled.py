from celery import shared_task

from notification.models import NotificationSetting, NotificationType
from notification.tasks.optimal_conditions import run_optimal_conditions_check


@shared_task(name="notification.tasks.run_notification_setting_check")
def run_notification_setting_check(setting_id: int):
    setting = NotificationSetting.objects.select_related("person").get(id=setting_id)

    if not setting.is_active:
        return {"setting_id": setting_id, "created": False, "reason": "inactive"}

    if setting.type == NotificationType.OPTIMAL_CONDITIONS:
        return run_optimal_conditions_check(setting)

    return {"setting_id": setting_id, "created": False, "reason": "unsupported_type"}
