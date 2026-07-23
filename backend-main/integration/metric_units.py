FRACTION_METRICS = frozenset({
    "soilMoisture",
    "soilMoisture10cm",
    "soilMoisture40cm",
    "soilMoisture100cm",
})


def normalize_metric_value(metric_key: str | None, value):
    if value is None or metric_key not in FRACTION_METRICS:
        return value
    if value > 1:
        return value / 100
    return value


def normalize_condition_values(values: dict, metric_key: str | None) -> dict:
    return {
        op: normalize_metric_value(metric_key, val)
        for op, val in values.items()
    }
