from django.db import models

from culture.models import CultureVariety
from integration.models import Integration, IntegrationField


class Operation(models.Model):
    name = models.CharField(max_length=255)


class Field(models.Model):
    class Type(models.IntegerChoices):
        START = 0
        FINISH = 1

    name = models.CharField(max_length=255)
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE)

    # TODO: надо убрать потому что есть связка на более конкретное поле IntegrationField
    integration = models.ForeignKey(Integration, on_delete=models.PROTECT, null=True)
    integration_field = models.ForeignKey(IntegrationField, on_delete=models.PROTECT, null=True)

    type = models.IntegerField(choices=Type.choices, default=0, blank=False)
    required = models.BooleanField(default=False)


class Condition(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    values = models.JSONField()
    culture_variety = models.ForeignKey(CultureVariety, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("field", "culture_variety")


class AlertOperationToCulture(models.Model):
    class Code(models.TextChoices):
        NOT_ALL_REQ_FIELD = "NOT_ALL_REQ_FIELD"

    culture_variety = models.ForeignKey(CultureVariety, on_delete=models.CASCADE)
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE)
    code = models.CharField(choices=Code.choices, max_length=255)

    class Meta:
        unique_together = ("operation", "culture_variety", "code")