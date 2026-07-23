from typing import List

from django.conf import settings
from django.db import models

from culture.models import CultureVariety
from field.models import Field as PhysicalField
from personal.models import Person
from agro_operation.models import Operation as AgroOperation, Field as AgroField, Condition as AgroCondition


class Task(models.Model):
    class Status(models.TextChoices):
        CREATED = 'created'
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        CLOSED_BY_OPERATOR = "closed_by_operator"

    creator = models.ForeignKey(Person, on_delete=models.PROTECT, related_name="task_creator")
    responsible = models.ForeignKey(Person, on_delete=models.PROTECT)
    operation = models.ForeignKey(AgroOperation, on_delete=models.PROTECT)
    culture_variety = models.ForeignKey(CultureVariety, on_delete=models.PROTECT)
    physical_field = models.ForeignKey(PhysicalField, on_delete=models.PROTECT)
    status = models.CharField(choices=Status.choices, max_length=255, default=Status.CREATED)
    deadline = models.DateTimeField()
    note = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_field_values(self) -> List["TaskFieldValue"]:
        return self.field_values.all()


class TaskFieldValue(models.Model):
    task = models.ForeignKey(Task, on_delete=models.PROTECT, related_name='field_values')

    condition_ref = models.ForeignKey(AgroCondition, on_delete=models.PROTECT)
    condition = models.JSONField(null=True, blank=True)

    field_ref = models.ForeignKey(AgroField, on_delete=models.PROTECT, null=True)
    field_name = models.CharField(max_length=255)
    field_type = models.IntegerField(choices=AgroField.Type.choices)

    value_numeric = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)


class TaskLogs(models.Model):
    task = models.ForeignKey(Task, on_delete=models.PROTECT, related_name='logs')
    log = models.JSONField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING)
