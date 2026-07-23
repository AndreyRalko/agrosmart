from rest_framework import serializers

from personal.serializers import PersonShortSerializer
from task.models import Task, TaskFieldValue
from core.serializer import TranslationSerializerReqLangMixinV2
from agro_operation.serializers import OperationShortSerializer
from field.serializers import FieldSerializerShort
from culture.serializers import CultureVarietySerializerReadShort


class TaskFieldValueSerializerRead(TranslationSerializerReqLangMixinV2, serializers.ModelSerializer):
    class Meta:
        model = TaskFieldValue
        fields = (
            "id",
            "field_name",
            "value_numeric",
            "condition",
        )


class TaskFieldValueSerializerCreateUpdate(serializers.ModelSerializer):
    class Meta:
        model = TaskFieldValue

        fields = (
            "field_ref",
            "value_numeric",
        )

    def get_field_id(self):
        return self.validated_data['field_ref']

    def get_value_numeric(self):
        return self.validated_data['value_numeric']


class TaskCreateSerializer(serializers.ModelSerializer):
    field_values_input = TaskFieldValueSerializerCreateUpdate(many=True)
    is_force = serializers.BooleanField(required=False,
                                        default=False)

    class Meta:
        model = Task
        fields = (
            "responsible",
            "operation",
            "culture_variety",
            "physical_field",
            "deadline",
            "note",

            "field_values_input",
            "is_force",
        )

    def create(self, validated_data):
        validated_data_new = {
            **validated_data,
        }
        validated_data_new.pop('field_values_input')
        validated_data_new.pop('is_force')

        return super(TaskCreateSerializer, self).create(validated_data_new)


class TaskFinishSerializer(serializers.Serializer):
    field_values_input = TaskFieldValueSerializerCreateUpdate(many=True)
    is_force = serializers.BooleanField(required=False,
                                        default=False)


class TaskSerializerListRead(serializers.ModelSerializer):
    creator = PersonShortSerializer(read_only=True)
    responsible = PersonShortSerializer(read_only=True)
    operation = OperationShortSerializer()
    culture_variety = CultureVarietySerializerReadShort()
    physical_field = FieldSerializerShort()
    field_values = TaskFieldValueSerializerRead(many=True, read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "creator",
            "responsible",
            "operation",
            "culture_variety",
            "physical_field",
            "status",
            "deadline",
            "note",

            "field_values",
        )
