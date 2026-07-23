from django.core.validators import MinValueValidator
from django.db import models
from field.models import Field


class IntegrationSource(models.TextChoices):
    TOMORROW_IO = 'tomorrow.io'
    STORMGLASS = 'stormglass.io'



class Integration(models.Model):
    class IntegrationType(models.IntegerChoices):
        FIELD = 0

    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=255, null=True, blank=True)

    api = models.CharField(choices=IntegrationSource.choices, max_length=255, null=True, blank=True)

    params_hard = models.JSONField(max_length=255, null=True, blank=True)
    body_hard = models.JSONField(max_length=255, null=True, blank=True)
    headers_hard = models.JSONField(max_length=255, null=True, blank=True)

    every_minute = models.PositiveIntegerField(null=False, blank=False, default=15, validators=[MinValueValidator(15)])
    type = models.IntegerField(IntegrationType.choices, null=False, blank=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["api",],
                name="uniq_integration_api",
            )
        ]


class IntegrationLog(models.Model):
    class Status(models.IntegerChoices):
        OK = 1
        FAILED = -1

    class ErrorType(models.TextChoices):
        API_TRANSPORT = "api_transport"  # таймаут/коннект/SSL/DNS
        API_HTTP = "api_http"  # 4xx/5xx
        API_BAD_JSON = "api_bad_json"  # ответ не JSON
        PARSE = "parse"  # структура JSON не та
        DB = "db"  # ошибка записи в БД
        PYTHON = "python"  # прочие

    integration = models.ForeignKey(Integration, on_delete=models.CASCADE)
    status = models.IntegerField(choices=Status.choices)

    error_type = models.CharField(max_length=32, choices=ErrorType.choices, null=True, blank=True)
    http_status = models.IntegerField(null=True, blank=True)

    # полный json ответа (если он json)
    result = models.JSONField(null=True, blank=True)

    # детали ошибки + meta (field_id/location/stage)
    error = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)


class IntegrationTemperatureField(models.Model):
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE)
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    integration_log = models.ForeignKey(IntegrationLog, on_delete=models.CASCADE)

    time = models.DateTimeField()
    temperature_c = models.FloatField(null=True)
    humidity_percent = models.FloatField(null=True)
    wind_speed_m_s = models.FloatField(null=True)
    pressure_hpa = models.FloatField(null=True)
    precipitation_probability_percent = models.FloatField(null=True)
    precipitation_intensity_mm_hr = models.FloatField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["integration", "field", "time"],
                name="uniq_integration_field_time",
            )
        ]
        indexes = [
            models.Index(fields=["integration", "field", "-time"]),
        ]

    def get_field_by_name(self, name):
        return dict(
            temperature_c=self.temperature_c,
            humidity_percent=self.humidity_percent,
            wind_speed_m_s=self.wind_speed_m_s,
            pressure_hpa=self.pressure_hpa,
            precipitation_probability_percent=self.precipitation_probability_percent,
            precipitation_intensity_mm_hr=self.precipitation_intensity_mm_hr,
        )[name]


class IntegrationDataField(models.Model):
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE)
    field = models.ForeignKey(Field, on_delete=models.CASCADE)
    integration_log = models.ForeignKey(IntegrationLog, on_delete=models.CASCADE)

    time = models.DateTimeField()
    data = models.JSONField(null=False, blank=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                models.F('integration'),
                models.F('field'),
                models.F('time').desc(),
                name="uniq_integration_data_field",
            )
        ]


# Заполняется вручную с полей IntegrationTemperatureField
class IntegrationField(models.Model):
    name = models.CharField(max_length=255)
    field_name = models.CharField(max_length=255, null=False, blank=False)
    integration = models.ForeignKey(Integration, on_delete=models.CASCADE, related_name="fields")
