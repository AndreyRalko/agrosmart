from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

@extend_schema_field({
    "type": "object",
    "additionalProperties": False,
    "minProperties": 1,
    "properties": {
        "eq":  {"type": "number", "format": "float"},
        "ne":  {"type": "number", "format": "float"},
        "gt":  {"type": "number", "format": "float"},
        "gte": {"type": "number", "format": "float"},
        "lt":  {"type": "number", "format": "float"},
        "lte": {"type": "number", "format": "float"},
    },
    "example": {"gte": 10.0, "lt": 20.5},
})
class ConditionValuesField(serializers.JSONField):
    pass
