from django.contrib.auth.models import User
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"


class Position(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}"


class PositionModulePermission(models.Model):
    position = models.ForeignKey(
        Position,
        on_delete=models.CASCADE,
        related_name="module_permissions",
    )
    module = models.CharField(max_length=50)
    can_view = models.BooleanField(default=False)
    can_create = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

    class Meta:
        unique_together = ("position", "module")
        indexes = [
            models.Index(fields=["position", "module"], name="position_module_idx"),
        ]

    def __str__(self):
        return f"{self.position_id}:{self.module}"

class Person(models.Model):
    class Status(models.IntegerChoices):
        WORKING = 1
        VACATION = 2
        FIRED = 3

    user = models.OneToOneField(User, on_delete=models.PROTECT)

    lastname = models.CharField(max_length=100)
    firstname = models.CharField(max_length=100)
    patronymic = models.CharField(max_length=100, blank=True, null=True)
    birth_date = models.DateField()
    position = models.ForeignKey(Position, on_delete=models.PROTECT)
    department = models.ForeignKey(Department, on_delete=models.PROTECT)
    hiring_date = models.DateField()
    firing_date = models.DateField(null=True, blank=True)

    status = models.IntegerField(choices=Status.choices, default=Status.WORKING)

    class Meta:
        indexes = [
            models.Index(fields=["lastname"], name="person_lastname_trgm_idx"),
            models.Index(fields=["firstname"], name="person_firstname_trgm_idx"),
            models.Index(fields=["patronymic"], name="person_patronymic_trgm_idx"),
        ]
"""
TODO: Это надо будет сделать
class Vacation(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
"""