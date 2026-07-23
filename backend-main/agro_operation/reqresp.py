from rest_framework import serializers

from agro_operation.serializers import OperationByCultureVarietyShortSerializer, ConditionItemSerializer
from .models import Operation


class OperationByCultureVarietyRequestSerializer(serializers.Serializer):
    culture_variety = serializers.IntegerField(required=True)


class OperationByCultureVarietyResponseSerializer(serializers.Serializer):
    results = OperationByCultureVarietyShortSerializer(many=True, read_only=True)



class OperationByCultureConditionsUpdateRequestSerializer(serializers.Serializer):
    from culture.models import CultureVariety

    culture_variety = serializers.PrimaryKeyRelatedField(queryset=CultureVariety.objects)
    operation = serializers.PrimaryKeyRelatedField(queryset=Operation.objects)

    conditions = ConditionItemSerializer(many=True)


class OperationByCultureConditionsUpdateResponseSerializer(serializers.Serializer):
    pass
