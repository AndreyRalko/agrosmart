from django.db import models


class FeedType(models.TextChoices):
    HAY = 'hay', 'Сено'
    SILAGE = 'silage', 'Силос'
    GRAIN = 'grain', 'Зерно'
    OTHER = 'other', 'Другое'


class Unit(models.TextChoices):
    TON = 't', 'т'
    KG = 'kg', 'кг'
    CUBIC_METER = 'm3', 'м³'


class StorageObject(models.Model):
    name = models.CharField(max_length=255)
    location = models.CharField(max_length=255)
    feed_type = models.CharField(max_length=50, choices=FeedType.choices)
    culture = models.CharField(max_length=255, blank=True)
    unit = models.CharField(max_length=10, choices=Unit.choices, default=Unit.TON)
    current_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_capacity = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def status(self):
        latest = self.sensors.order_by('-created_at').first()
        if not latest:
            return 'normal'
        return latest.status


class SensorDevice(models.Model):
    storage = models.ForeignKey(StorageObject, on_delete=models.CASCADE, related_name='devices')
    name = models.CharField(max_length=255)
    device_id = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.name} → {self.storage.name}'


class StorageSensor(models.Model):
    storage = models.ForeignKey(StorageObject, on_delete=models.CASCADE, related_name='sensors')
    device = models.ForeignKey(SensorDevice, on_delete=models.SET_NULL, null=True, blank=True, related_name='readings')
    temperature = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    humidity = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.storage.name} - {self.created_at}'

    @property
    def status(self):
        if self.temperature is not None and self.temperature > 25:
            return 'warning'
        if self.humidity is not None and self.humidity > 80:
            return 'warning'
        return 'normal'


class FeedChemistry(models.Model):
    storage = models.ForeignKey(StorageObject, on_delete=models.CASCADE, related_name='chemistry')
    sample_name = models.CharField(max_length=255, blank=True)
    dry_matter = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    protein = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fat = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    fiber = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    ash = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    starch = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    sugar = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    energy = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.sample_name or "sample"} - {self.storage.name}'