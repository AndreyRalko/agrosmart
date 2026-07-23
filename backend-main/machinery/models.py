from django.db import models


class Brand(models.Model):
    name = models.CharField(max_length=100)


class Type(models.Model):
    name = models.CharField(max_length=100)


class Machinery(models.Model):
    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, null=False, blank=False)
    type = models.ForeignKey(Type, on_delete=models.PROTECT, null=False, blank=False)
    year_production = models.IntegerField(null=False, blank=False)
    gov_num = models.CharField(max_length=100, null=False, blank=False, unique=True)

    class Meta:
        indexes = [
            models.Index(fields=["gov_num"], name="machinery_gov_num_trgm_idx"),
        ]