from django.db import models


class TransportationOperation(models.Model):
    operation = models.OneToOneField(
        "agro_operation.Operation",
        on_delete=models.CASCADE,
        related_name="transportation_details"
    )

    def __str__(self):
        return f"TransportationOperation for: {self.operation}"

    class Meta:
        verbose_name = "Transportation Operation"
        verbose_name_plural = "Transportation Operations"


class TransportationTask(models.Model):
    task = models.OneToOneField(
        "task.Task",
        on_delete=models.CASCADE,
        related_name="transportation_details"
    )
    machinery = models.ForeignKey(
        "machinery.Machinery",
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )
    from_place_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Origin Name"
    )
    from_place_x = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Origin Longitude (X)"
    )
    from_place_y = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Origin Latitude (Y)"
    )
    to_place_name = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        verbose_name="Destination Name"
    )
    to_place_x = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Destination Longitude (X)"
    )
    to_place_y = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Destination Latitude (Y)"
    )
    description = models.TextField(
        null=True,
        blank=True,
        verbose_name="Description"
    )

    def __str__(self):
        return f"TransportationTask for: {self.task}"

    class Meta:
        verbose_name = "Transportation Task"
        verbose_name_plural = "Transportation Tasks"
