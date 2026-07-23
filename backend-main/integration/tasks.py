# integration/tasks.py
import os
import traceback
from decimal import Decimal
from typing import List

import requests, time
from celery import shared_task
from django.db import DatabaseError

from field.models import Field
from .models import Integration, IntegrationLog, IntegrationDataField
from .integration_services import get_integration_service

RETRY_CNT = 3


def _serialize_query_params(params: dict) -> list[tuple[str, object]]:
    items: list[tuple[str, object]] = []
    for key, value in params.items():
        if isinstance(value, list):
            for item in value:
                items.append((key, item))
        else:
            items.append((key, value))
    return items


def field_center(field) -> tuple[float, float]:
    lat = (
                  field.pos_top_left_lat +
                  field.pos_top_right_lat +
                  field.pos_bottom_left_lat +
                  field.pos_bottom_right_lat
          ) / Decimal("4")

    lon = (
                  field.pos_top_left_lon +
                  field.pos_top_right_lon +
                  field.pos_bottom_left_lon +
                  field.pos_bottom_right_lon
          ) / Decimal("4")

    return float(lat), float(lon)


def _exc_payload(e: Exception, *, extra: dict | None = None) -> dict:
    payload = {
        "exception_class": e.__class__.__name__,
        "message": str(e),
        "traceback_tail": traceback.format_exc().splitlines()[-25:],
    }
    if extra:
        payload.update(extra)
    return payload


@shared_task(bind=True, max_retries=1, default_retry_delay=30)
def run_integration_for_all_fields(self, integration_id: int):
    if os.getenv("INTEGRATION_PASS", None) == 'ok':
        return
    integration = Integration.objects.get(id=integration_id)

    if integration.api is None:
        return {
            "integration_id": integration_id,
            "exit": "no api"
        }

    total_rows = 0
    ok_calls = 0
    failed_calls = 0

    fields_qs = Field.objects.all().only(
        "id",
        "pos_top_left_lat", "pos_top_left_lon",
        "pos_top_right_lat", "pos_top_right_lon",
        "pos_bottom_left_lat", "pos_bottom_left_lon",
        "pos_bottom_right_lat", "pos_bottom_right_lon",
    )

    integration_srv = get_integration_service(integration.api)

    for field in fields_qs.iterator(chunk_size=200):
        lat, lon = field_center(field)

        params = dict(integration.params_hard or {})
        body = dict(integration.body_hard or {})
        headers = dict(integration.headers_hard or {})
        integration_srv.request_body_enrichment(params, body, headers, lat, lon)

        kwargs = {}
        if params:
            kwargs["params"] = _serialize_query_params(params)

        if body:
            kwargs["json"] = body

        if headers:
            kwargs["headers"] = headers

        try:
            for i in range(RETRY_CNT):
                resp = requests.request(
                    integration_srv.get_http_method(),
                    integration_srv.get_endpoint(),
                    **kwargs,
                    timeout=30,
                )

                # 4xx/5xx -> отдельный log
                if resp.status_code >= 400:
                    IntegrationLog.objects.create(
                        integration=integration,
                        status=IntegrationLog.Status.FAILED,
                        error_type=IntegrationLog.ErrorType.API_HTTP,
                        http_status=resp.status_code,
                        error={
                            "field_id": field.id,
                            "stage": f"http-{i + 1}",
                            "response_text_snippet": resp.text[:2000],
                        },
                    )
                    failed_calls += 1

                    if resp.status_code == 429:
                        time.sleep(3)

                elif resp.status_code == 200:
                    break
            else:
                continue
            # decode json
            try:
                data = resp.json()
            except Exception as e:
                IntegrationLog.objects.create(
                    integration=integration,
                    status=IntegrationLog.Status.FAILED,
                    error_type=IntegrationLog.ErrorType.API_BAD_JSON,
                    http_status=resp.status_code,
                    error=_exc_payload(e, extra={
                        "field_id": field.id,
                        "stage": "json_decode",
                        "response_text_snippet": resp.text[:2000],
                    }),
                )
                failed_calls += 1
                continue

            # OK log (с полным json)
            log = IntegrationLog.objects.create(
                integration=integration,
                status=IntegrationLog.Status.OK,
                error_type=None,
                http_status=resp.status_code,
                result=data,
                error={
                    "field_id": field.id,
                },
            )

            try:
                rows = integration_srv.response_body_store_preparation(log, integration, field, data)
            except Exception:
                failed_calls += 1
                continue
            try:
                if rows:
                    IntegrationDataField.objects.bulk_create(
                        rows,
                        batch_size=1000,
                        ignore_conflicts=True,  # при uniq_integration_field_time
                    )
                    total_rows += len(rows)

                ok_calls += 1

            except DatabaseError as e:
                # помечаем этот вызов как failed (но result уже сохранён)
                log.status = IntegrationLog.Status.FAILED
                log.error_type = IntegrationLog.ErrorType.DB
                log.error = _exc_payload(e, extra={
                    "field_id": field.id,
                    "stage": "db_write",
                })
                log.save(update_fields=["status", "error_type", "error"])
                failed_calls += 1

        except requests.exceptions.RequestException as e:
            IntegrationLog.objects.create(
                integration=integration,
                status=IntegrationLog.Status.FAILED,
                error_type=IntegrationLog.ErrorType.API_TRANSPORT,
                error=_exc_payload(e, extra={
                    "field_id": field.id,
                    "stage": "request",
                }),
            )
            failed_calls += 1

        except Exception as e:
            IntegrationLog.objects.create(
                integration=integration,
                status=IntegrationLog.Status.FAILED,
                error_type=IntegrationLog.ErrorType.PYTHON,
                error=_exc_payload(e, extra={
                    "field_id": field.id,
                    "stage": "python",
                }),
            )
            failed_calls += 1

    return {
        "api_calls_ok": ok_calls,
        "api_calls_failed": failed_calls,
        "created_rows": total_rows,
    }
