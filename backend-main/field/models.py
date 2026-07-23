from django.db import models


class Field(models.Model):
    no = models.CharField(max_length=255, unique=True)
    square = models.IntegerField()

    pos_top_left_lat = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)
    pos_top_left_lon = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)

    pos_top_right_lat = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)
    pos_top_right_lon = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)

    pos_bottom_left_lat = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)
    pos_bottom_left_lon = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)

    pos_bottom_right_lat = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)
    pos_bottom_right_lon = models.DecimalField(max_digits=10, decimal_places=6, db_default=0)

    class Meta:
        indexes = [
            models.Index(fields=["no"], name="field_no_trgm_idx"),
        ]