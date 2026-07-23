from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

from personal.models import Person


class Breed(models.Model):
    name = models.CharField(max_length=255)


class Animal(models.Model):
    breed = models.ForeignKey(Breed, on_delete=models.PROTECT)
    birthday = models.DateField(null=False, blank=False)
    tag = models.CharField(max_length=255, null=False, blank=False, unique=True)
    daily_yield_litre = models.IntegerField(null=False, blank=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["tag"], name="animal_tag_trgm_idx"),
        ]

class MilkQuality(models.Model):
    animal = models.ForeignKey(Animal, null=False, blank=False, on_delete=models.PROTECT)
    report_date = models.DateField(null=False, blank=False)

    person_created = models.ForeignKey(Person, null=False, blank=False, on_delete=models.PROTECT, related_name="+")
    person_updated = models.ForeignKey(Person, null=True, blank=True, on_delete=models.PROTECT, related_name="+")

    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    fat_percent = models.IntegerField(null=False, blank=False, validators=[
        MinValueValidator(0),
        MaxValueValidator(100),
    ])
    protein_percent = models.IntegerField(null=False, blank=False, validators=[
        MinValueValidator(0),
        MaxValueValidator(100),
    ])

    class Meta:
        indexes = [
            models.Index(
                fields=["animal_id", "report_date", "id"],
                name="field_report_date__id_idx",
            )
        ]
