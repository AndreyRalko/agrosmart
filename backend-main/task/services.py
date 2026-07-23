import datetime
from typing import Iterable, List, Optional

from rest_framework import serializers

import agro_operation.validators as agro_op_validators
from agro_operation.models import Condition as AgroCondition, Field as AgroField
from integration.metric_units import normalize_condition_values, normalize_metric_value
from integration.services import IntegrationDataFieldRepo
from task.models import TaskFieldValue


class TaskConditionCheckService:
    @staticmethod
    def _get_input_value_map(field_values_input: List[dict]) -> dict[int, Optional[float]]:
        result = {}
        for item in field_values_input:
            field_ref = item.get("field_ref")
            field_id = getattr(field_ref, "id", field_ref)
            result[field_id] = item.get("value_numeric")
        return result

    @classmethod
    def build_task_field_values(
        cls,
        operation,
        culture_variety,
    ) -> List[TaskFieldValue]:
        conditions = (
            AgroCondition.objects
            .select_related("field", "field__operation", "field__integration_field", "field__integration_field__integration")
            .filter(culture_variety=culture_variety, field__operation=operation)
        )

        return [
            TaskFieldValue(
                condition_ref=cond,
                condition=cond.values,
                field_ref=cond.field,
                field_name=cond.field.name,
                field_type=cond.field.type,
            )
            for cond in conditions
        ]

    @classmethod
    def resolve_values(
        cls,
        task_field_values: Iterable[TaskFieldValue],
        physical_field,
        field_values_input: List[dict],
        is_force: bool,
        field_type: AgroField.Type,
        dt: datetime.datetime,
    ) -> tuple[list[TaskFieldValue], list[dict]]:
        errors = []
        resolved_fields = []
        field_values_mapped_by_field_id = cls._get_input_value_map(field_values_input)

        for field in task_field_values:
            if field.field_type != field_type:
                continue

            integration_field = field.field_ref.integration_field
            field_value_input = field_values_mapped_by_field_id.get(field.field_ref.id)
            if integration_field is not None and integration_field.integration.api is not None:
                last_integration_log = IntegrationDataFieldRepo.get_last_by_field(
                    integration_field.integration.id,
                    physical_field.id,
                    dt,
                )
                if last_integration_log:
                    field.value_numeric = last_integration_log.data[integration_field.field_name]
                else:
                    field.value_numeric = None
            else:
                field.value_numeric = field_value_input

            metric_key = integration_field.field_name if integration_field else None
            condition = normalize_condition_values(field.condition or {}, metric_key)
            value = normalize_metric_value(metric_key, field.value_numeric)

            ok, explain = agro_op_validators.check_condition(condition, value)
            if not (ok or is_force):
                metric_label = None
                if integration_field is not None:
                    metric_label = integration_field.name

                errors.append(
                    {
                        "code": "check_condition__error",
                        "condition": condition,
                        "field_ref": field.field_ref.id,
                        "field_name": field.field_name,
                        "metric_key": metric_key,
                        "metric_label": metric_label,
                        "explain": explain,
                        "value": value,
                    }
                )
            else:
                resolved_fields.append(field)

        return resolved_fields, errors

    @classmethod
    def validate_or_raise(
        cls,
        task_field_values: Iterable[TaskFieldValue],
        physical_field,
        field_values_input: List[dict],
        is_force: bool,
        field_type: AgroField.Type,
        dt: datetime.datetime,
    ) -> list[TaskFieldValue]:
        resolved_fields, errors = cls.resolve_values(
            task_field_values=task_field_values,
            physical_field=physical_field,
            field_values_input=field_values_input,
            is_force=is_force,
            field_type=field_type,
            dt=dt,
        )
        if errors:
            raise serializers.ValidationError({"errors": errors})
        return resolved_fields
