from rest_framework import serializers
from .models import TransportationOperation, TransportationTask


class TransportationOperationSerializer(serializers.ModelSerializer):
    operation_name = serializers.CharField(source="operation.name", read_only=True)

    class Meta:
        model = TransportationOperation
        fields = ("id", "operation", "operation_name")


class TransportationTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = TransportationTask
        fields = (
            "id",
            "task",
            "machinery",
            "from_place_name",
            "from_place_x",
            "from_place_y",
            "to_place_name",
            "to_place_x",
            "to_place_y",
            "description",
        )

    def validate(self, attrs):
        from_x = attrs.get("from_place_x")
        from_y = attrs.get("from_place_y")
        to_x = attrs.get("to_place_x")
        to_y = attrs.get("to_place_y")

        if (from_x is None) != (from_y is None):
            missing = "from_place_x" if from_x is None else "from_place_y"
            raise serializers.ValidationError(
                {missing: "Both origin coordinates must be provided together."}
            )

        if (to_x is None) != (to_y is None):
            missing = "to_place_x" if to_x is None else "to_place_y"
            raise serializers.ValidationError(
                {missing: "Both destination coordinates must be provided together."}
            )

        if (from_x is not None) and (to_x is None):
            raise serializers.ValidationError(
                {"to_place": "Destination coordinates are required when origin is provided."}
            )

        if (to_x is not None) and (from_x is None):
            raise serializers.ValidationError(
                {"from_place": "Origin coordinates are required when destination is provided."}
            )

        return attrs