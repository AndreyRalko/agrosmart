from abc import ABC, abstractmethod
from typing import List

import arrow

from field.models import Field
from .exceptions import TimelineNotFoundException
from .helpers import _aware
from .models import IntegrationLog, Integration, IntegrationDataField, IntegrationSource

from django.utils.dateparse import parse_datetime


class BaseIntegrationService(ABC):
    def __init__(self, endpoint, http_method):
        self.__endpoint = endpoint
        self.__http_method = http_method

    def get_endpoint(self):
        return self.__endpoint

    def get_http_method(self):
        return self.__http_method

    @abstractmethod
    def request_body_enrichment(self, params:dict, body: dict, headers: dict, lat: float, lon: float):
        raise NotImplementedError()

    @abstractmethod
    def response_body_store_preparation(
            self,
            log: IntegrationLog,
            integration: Integration,
            field: Field,
            data: dict
    ):
        raise NotImplementedError()


class TomorrowIoIntegrationService(BaseIntegrationService):
    def __init__(self):
        super().__init__(endpoint='https://api.tomorrow.io/v4/timelines', http_method="post")

    def request_body_enrichment(self, params:dict, body: dict, headers: dict, lat: float, lon: float):
        body["location"] =  f"{lat},{lon}"

    def response_body_store_preparation(
            self,
            log: IntegrationLog,
            integration: Integration,
            field: Field,
            data: dict
    ) -> List[IntegrationDataField]:
        timelines = (data.get("data") or {}).get("timelines") or []
        if not timelines:
            log.status = IntegrationLog.Status.FAILED
            log.error_type = IntegrationLog.ErrorType.PARSE
            log.error = {
                "field_id": field.id,
                "stage": "parse",
                "reason": "No timelines in response",
                "expected_path": "data.timelines[].intervals[]",
            }
            log.save(update_fields=["status", "error_type", "error"])
            raise TimelineNotFoundException

        rows: List[IntegrationDataField] = []
        for tl in timelines:
            for it in (tl.get("intervals") or []):
                dt = _aware(parse_datetime(it.get("startTime")))
                v = it.get("values") or {}

                rows.append(
                    IntegrationDataField(
                        integration=integration,
                        field=field,
                        integration_log=log,
                        time=dt,
                        data=dict(
                            temperature_c=v.get("temperature"),
                            humidity_percent=v.get("humidity"),
                            wind_speed_m_s=v.get("windSpeed"),
                            pressure_hpa=v.get("pressureSurfaceLevel"),
                            precipitation_probability_percent=v.get("precipitationProbability"),
                            precipitation_intensity_mm_hr=v.get("precipitationIntensity")
                        )
                    )
                )

        return rows

class StormGlassIntegrationService(BaseIntegrationService):
    SOIL_PARAMS = (
        "soilMoisture",
        "soilMoisture10cm",
        "soilMoisture40cm",
        "soilMoisture100cm",
        "soilTemperature",
        "soilTemperature10cm",
        "soilTemperature40cm",
        "soilTemperature100cm",
    )
    SOURCE_PRIORITY = ("noaa", "sg", "ecmwf", "mercator", "meto")

    def __init__(self):
        super().__init__(endpoint='https://api.stormglass.io/v2/bio/point', http_method="get")

    @classmethod
    def extract_param_value(cls, data: dict, param: str):
        nested = data.get(param)
        if nested is None:
            return None
        if isinstance(nested, (int, float)):
            return nested
        if not isinstance(nested, dict):
            return None

        for source in cls.SOURCE_PRIORITY:
            value = nested.get(source)
            if value is not None:
                return value

        for value in nested.values():
            if value is not None:
                return value

        return None

    def request_body_enrichment(self, params:dict, body: dict, headers: dict, lat: float, lon: float):
        now = arrow.now().to('UTC')
        params.clear()
        params["params"] = list(self.SOIL_PARAMS)
        params["lat"] = lat
        params["lng"] = lon
        params["start"] = now.floor('day').format('YYYY-MM-DDTHH:mm:ss')
        params["end"] = now.shift(days=1).floor('day').format('YYYY-MM-DDTHH:mm:ss')

    def response_body_store_preparation(
            self,
            log: IntegrationLog,
            integration: Integration,
            field: Field,
            data: dict
    ) -> List[IntegrationDataField]:
        timelines = data.get("hours") or []
        if not timelines:
            log.status = IntegrationLog.Status.FAILED
            log.error_type = IntegrationLog.ErrorType.PARSE
            log.error = {
                "field_id": field.id,
                "stage": "parse",
                "reason": "No timelines in response",
                "expected_path": "hours[]",
                "meta": data.get("meta"),
            }
            log.save(update_fields=["status", "error_type", "error"])
            raise TimelineNotFoundException

        rows: List[IntegrationDataField] = []
        for it in timelines:
            dt = _aware(parse_datetime(it.get("time")))
            rows.append(
                IntegrationDataField(
                    integration=integration,
                    field=field,
                    integration_log=log,
                    time=dt,
                    data={
                        param: self.extract_param_value(it, param)
                        for param in self.SOIL_PARAMS
                    },
                )
            )

        return rows


__api_mapping: dict[str, BaseIntegrationService] = {
    IntegrationSource.TOMORROW_IO: TomorrowIoIntegrationService(),
    IntegrationSource.STORMGLASS: StormGlassIntegrationService()
}


def get_integration_service(api: str) -> BaseIntegrationService:
    return __api_mapping.get(api)
