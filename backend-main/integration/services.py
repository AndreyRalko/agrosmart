import datetime
from typing import Optional

from .models import IntegrationTemperatureField, IntegrationDataField


class TomorrowIoIntegrationRepo:
    @classmethod
    def get_last_by_field(cls, integration_id: int, field_id: int, dt: datetime.datetime) -> Optional[IntegrationTemperatureField]:
        return (
            IntegrationTemperatureField.objects.filter(
                integration_id=integration_id,
                field_id=field_id,
                time__lte=dt
            ).order_by("-time")
            .first()
        )

class IntegrationDataFieldRepo:
    @classmethod
    def get_last_by_field(cls, integration_id: int, field_id: int, dt: datetime.datetime) -> Optional[IntegrationDataField]:
        return (
            IntegrationDataField.objects.filter(
                integration_id=integration_id,
                field_id=field_id,
                time__lte=dt
            ).order_by("-time")
            .first()
        )
