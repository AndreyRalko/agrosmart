from datetime import timedelta

from django.utils import timezone

from agro_operation.models import Field as AgroField, Operation
from culture.models import CultureVariety
from field.models import Field
from notification.models import (
    Notification,
    NotificationAgroOpField,
    NotificationSetting,
    NotificationType,
)
from notification.tasks.messages import (
    build_optimal_conditions_i18n,
    get_translated_name,
)
from task.services import TaskConditionCheckService


def has_duplicate(field, culture_variety, operation, prediction_time) -> bool:
    return NotificationAgroOpField.objects.filter(
        field_id=field.id,
        culture_variety_id=culture_variety.id,
        operation_id=operation.id,
        time=prediction_time,
    ).exists()


def load_setting_targets(setting: NotificationSetting) -> tuple[Field, CultureVariety, Operation]:
    field = Field.objects.get(id=setting.params["field_id"])
    culture_variety = CultureVariety.objects.get(id=setting.params["culture_variety_id"])
    operation = Operation.objects.get(id=setting.params["operation_id"])
    return field, culture_variety, operation


def resolve_matching_fields(field, culture_variety, operation, dt):
    task_field_values = TaskConditionCheckService.build_task_field_values(
        operation=operation,
        culture_variety=culture_variety,
    )
    return TaskConditionCheckService.resolve_values(
        task_field_values=task_field_values,
        physical_field=field,
        field_values_input=[],
        is_force=False,
        field_type=AgroField.Type.START,
        dt=dt,
    )


def serialize_checked_conditions(resolved_fields) -> list[dict]:
    items = []
    for resolved_field in resolved_fields:
        items.append(
            {
                "field_ref": resolved_field.field_ref.id,
                "field_name": resolved_field.field_name,
                "field_type": resolved_field.field_type,
                "condition": resolved_field.condition,
                "value_numeric": float(resolved_field.value_numeric) if resolved_field.value_numeric is not None else None,
            }
        )
    return items


def find_prediction_time(setting: NotificationSetting, field, culture_variety, operation):
    now = timezone.now()
    local_now = timezone.localtime(now)
    local_start = local_now.replace(minute=0, second=0, microsecond=0)

    if local_now.hour < setting.active_from_hour:
        return None, None

    for hours_ahead in range(setting.min_look_ahead_hours, setting.look_ahead_hours + 1):
        prediction_dt = local_start + timedelta(hours=hours_ahead)
        resolved_fields, errors = resolve_matching_fields(
            field=field,
            culture_variety=culture_variety,
            operation=operation,
            dt=prediction_dt,
        )
        if resolved_fields and not errors:
            return prediction_dt, resolved_fields

    return None, []


def create_notification(setting: NotificationSetting, field, culture_variety, operation, prediction_time, resolved_fields) -> Notification:
    title_i18n, msg_i18n = build_optimal_conditions_i18n(field, culture_variety, operation, prediction_time)
    notification = Notification.objects.create(
        person=setting.person,
        setting=setting,
        type=setting.type,
        title=title_i18n["ru"],
        title_ru=title_i18n["ru"],
        title_kk=title_i18n["kk"],
        msg=msg_i18n["ru"],
        msg_ru=msg_i18n["ru"],
        msg_kk=msg_i18n["kk"],
        payload=setting.params,
    )
    NotificationAgroOpField.objects.create(
        notification=notification,
        field_id=field.id,
        field_no=field.no,
        time=prediction_time,
        checked_conditions=serialize_checked_conditions(resolved_fields),
        culture_variety_id=culture_variety.id,
        culture_variety_name=get_translated_name(culture_variety, "ru"),
        culture_variety_name_ru=get_translated_name(culture_variety, "ru"),
        culture_variety_name_kk=get_translated_name(culture_variety, "kk"),
        operation_id=operation.id,
        operation_name=get_translated_name(operation, "ru"),
        operation_name_ru=get_translated_name(operation, "ru"),
        operation_name_kk=get_translated_name(operation, "kk"),
    )
    return notification


def run_optimal_conditions_check(setting: NotificationSetting) -> dict:
    field, culture_variety, operation = load_setting_targets(setting)
    prediction_time, resolved_fields = find_prediction_time(setting, field, culture_variety, operation)

    if prediction_time is None:
        return {"setting_id": setting.id, "created": False, "reason": "not_matching"}

    if has_duplicate(field, culture_variety, operation, prediction_time):
        return {"setting_id": setting.id, "created": False, "reason": "duplicate"}

    notification = create_notification(
        setting=setting,
        field=field,
        culture_variety=culture_variety,
        operation=operation,
        prediction_time=prediction_time,
        resolved_fields=resolved_fields,
    )
    return {"setting_id": setting.id, "created": True, "notification_id": notification.id}
