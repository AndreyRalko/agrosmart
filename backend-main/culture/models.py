from django.db import models


class Culture(models.Model):
    name = models.CharField(max_length=255, blank=False, null=False)


class CultureVariety(models.Model):
    class OptionKeys:
        npk_removal = "npk-removal"

    class NpkRemovalKeys:
        n = "N"
        p2o5 = "P2O5"
        k2o = "K2O"

    culture = models.ForeignKey(Culture, on_delete=models.CASCADE, related_name="varieties")
    name = models.CharField(max_length=255, blank=False, null=False)
    options = models.JSONField(blank=False, null=False)
