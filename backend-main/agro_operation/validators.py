from typing import Tuple, Optional

from django.utils.translation import gettext_lazy as _
from rest_framework.exceptions import ValidationError
from . import constants

def _is_number(v) -> bool:
    return isinstance(v, float) or isinstance(v, int)

def validate_condition_values(values):
    if not isinstance(values, dict):
        raise ValidationError({"values": [_("Must be a JSON object.")]})
    if not values:
        raise ValidationError({"values": [_("This field cannot be empty.")]})

    errors = {}

    unknown = set(values.keys()) - constants.ALLOWED_OPS
    if unknown:
        errors["values"] = [
            _("Unknown operators: %(ops)s") % {"ops": ", ".join(sorted(unknown))}
        ]

    for op, v in values.items():
        if op not in constants.ALLOWED_OPS:
            continue

        if v is None or isinstance(v, (list, dict)) or not _is_number(v):
            errors[f"values.{op}"] = [
                _("Must be a float number or integer (e.g. 1, 2, 10.0, 10.5).")
            ]
        else:
            if isinstance(v, int):
                values[op] = float(v)

    if "eq" in values and any(x in values for x in constants.NOT_EQ_OPS):
        errors.setdefault("non_field_errors", []).append(
            _("Do not mix 'eq' with range operators in the same condition or ne.")
        )

    if errors:
        raise ValidationError(errors)

    return values


def check_condition(condition: dict, value: float) -> Tuple[bool, Optional[str]]:
    if value is None:
        return False, 'none-check'

    for op, v in condition.items():
        if op == "eq":
            if value != v:
                return False, 'eq'

        elif op == "ne":
            if value == v:
                return False, 'ne'

        elif op == "gt":
            if not value > v:
                return False, 'gt'

        elif op == "gte":
            if not value >= v:
                return False, 'gte'

        elif op == "lt":
            if not value < v:
                return False, 'lt'

        elif op == "lte":
            if not value <= v:
                return False, 'lte'

    return True, None