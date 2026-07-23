from .models import Integration, IntegrationField, IntegrationSource

DEFAULT_INTEGRATION_FIELDS: dict[str, list[tuple[str, str]]] = {
    IntegrationSource.TOMORROW_IO: [
        ("Температура", "temperature_c"),
        ("Влажность", "humidity_percent"),
        ("Ветер", "wind_speed_m_s"),
        ("Давление", "pressure_hpa"),
        ("Вероятность осадков", "precipitation_probability_percent"),
        ("Осадки", "precipitation_intensity_mm_hr"),
    ],
    IntegrationSource.STORMGLASS: [
        ("Влажность почвы", "soilMoisture"),
        ("Влажность почвы 10 см", "soilMoisture10cm"),
        ("Влажность почвы 40 см", "soilMoisture40cm"),
        ("Влажность почвы 100 см", "soilMoisture100cm"),
        ("Температура почвы", "soilTemperature"),
        ("Температура почвы 10 см", "soilTemperature10cm"),
        ("Температура почвы 40 см", "soilTemperature40cm"),
        ("Температура почвы 100 см", "soilTemperature100cm"),
    ],
}


def sync_integration_fields(integration: Integration) -> int:
    if not integration.api:
        return 0

    specs = DEFAULT_INTEGRATION_FIELDS.get(integration.api)
    if not specs:
        return 0

    created = 0
    for label, field_name in specs:
        _, was_created = IntegrationField.objects.get_or_create(
            integration=integration,
            field_name=field_name,
            defaults={"name_ru": label, "name_kk": label},
        )
        if was_created:
            created += 1
    return created
