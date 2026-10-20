from django.db import models
from field.models import Field


class NdviObservation(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='ndvi_observations')
    scene_date = models.DateField()
    scene_id = models.CharField(max_length=160)
    ndvi_mean = models.FloatField()
    cloud_cover = models.FloatField(null=True, blank=True)
    source = models.CharField(max_length=32, default='sentinel-2')

    class Meta:
        ordering = ['scene_date', 'id']
        unique_together = ('field', 'scene_id')

    def __str__(self):
        return f"Field {self.field_id} — {self.scene_date} — NDVI {self.ndvi_mean}"


class DroneUpload(models.Model):
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='drone_uploads')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    flight_date = models.DateField()
    original_filename = models.CharField(max_length=255)
    file_size_mb = models.FloatField()
    file_type = models.CharField(max_length=20)
    ndvi_image = models.ImageField(upload_to='ndvi/images/')
    ndvi_mean = models.FloatField()
    ndvi_min = models.FloatField()
    ndvi_max = models.FloatField()
    ndvi_std = models.FloatField()

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Field {self.field.no} — {self.flight_date} — NDVI {self.ndvi_mean}"