import datetime
from typing import List, Optional

from django.db import transaction
from rest_framework import viewsets, status, serializers, mixins
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.drf_permissions import ModulePermission

from agro_operation.models import Field as AgroField
from personal.models import Person
from task.models import Task, TaskFieldValue
from task.serializers import TaskCreateSerializer, TaskSerializerListRead, TaskFinishSerializer
from task.services import TaskConditionCheckService

from abc import ABC, abstractmethod


class TaskCreateFieldValueInterface(ABC):
    @abstractmethod
    def get_filed_id(self) -> int:
        pass

    @abstractmethod
    def get_value_numeric(self) -> Optional[int]:
        pass

class TaskService:
    @classmethod
    def get_creator_or_raise(cls, user) -> Person:
        try:
            return user.person
        except Person.DoesNotExist:
            raise serializers.ValidationError({
                "code": "user_has_no_person",
                "detail": "У текущего пользователя нет профиля сотрудника. Создайте сотрудника в разделе «Персонал» или войдите под другой учётной записью.",
            })

    @classmethod
    def create(cls, dto: TaskCreateSerializer, creator: Person) -> Task:
        operation = dto.validated_data["operation"]
        culture_variety = dto.validated_data["culture_variety"]
        task_field_values = TaskConditionCheckService.build_task_field_values(
            operation=operation,
            culture_variety=culture_variety,
        )

        with transaction.atomic():
            task = dto.save(status=Task.Status.CREATED, creator=creator)

            tfv_to_create = []
            for task_field_value in task_field_values:
                task_field_value.task = task
                tfv_to_create.append(task_field_value)

            TaskFieldValue.objects.bulk_create(tfv_to_create)
            cls.fill_fields_by_type(task, dto.validated_data["field_values_input"], dto.validated_data["is_force"], AgroField.Type.START)
            cls.apply_manual_finish_values(task, dto.validated_data["field_values_input"])

            return task

    @classmethod
    def apply_manual_finish_values(cls, task: Task, field_values_input: List[dict]) -> None:
        field_values_map = TaskConditionCheckService._get_input_value_map(field_values_input)
        to_update = []
        for tfv in TaskFieldValue.objects.filter(task=task).select_related("field_ref", "field_ref__integration_field"):
            if tfv.field_type != AgroField.Type.FINISH:
                continue
            if tfv.field_ref is None or tfv.field_ref.integration_field_id is not None:
                continue
            val = field_values_map.get(tfv.field_ref_id)
            if val is not None:
                tfv.value_numeric = val
                to_update.append(tfv)
        if to_update:
            TaskFieldValue.objects.bulk_update(to_update, ["value_numeric"])

    @classmethod
    def fill_fields_by_type(cls,
                            task: Task,
                            field_values: List[dict],
                            is_force: bool,
                            field_type: AgroField.Type
                            ):
        fields = TaskConditionCheckService.validate_or_raise(
            task_field_values=task.get_field_values(),
            physical_field=task.physical_field,
            field_values_input=field_values,
            is_force=is_force,
            field_type=field_type,
            dt=datetime.datetime.now(),
        )
        [field.save() for field in task.get_field_values()]
        TaskFieldValue.objects.bulk_update(fields, ['value_numeric'])

    @classmethod
    def finish(cls, task: Task, dto: TaskFinishSerializer) -> Task:
        if task.status != Task.Status.CREATED:
            raise serializers.ValidationError({
                "code": "task_already_finished",
            })

        with transaction.atomic():
            cls.fill_fields_by_type(task, dto.validated_data["field_values_input"], dto.validated_data["is_force"],
                                    AgroField.Type.FINISH)
            task.status = Task.Status.COMPLETED
            task.save()
            return task

class TaskViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Task.objects.all().prefetch_related()
    module_key = "tasks"
    permission_classes = [IsAuthenticated, ModulePermission]

    def get_serializer_class(self):
        if self.action == "create":
            return TaskCreateSerializer
        if self.action == "finish":
            return TaskFinishSerializer
        return TaskSerializerListRead

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = TaskService.create(serializer, TaskService.get_creator_or_raise(request.user))

        out = TaskSerializerListRead(task)
        return Response(out.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def finish(self, request, pk=None):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        task = TaskService.finish(self.get_object(), serializer)

        out = TaskSerializerListRead(task)
        return Response(out.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        with transaction.atomic():
            instance.field_values.all().delete()
            instance.logs.all().delete()
            self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
