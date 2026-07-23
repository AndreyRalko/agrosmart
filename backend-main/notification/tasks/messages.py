from django.utils import timezone, translation
from django.utils.translation import gettext as _


def get_translated_name(obj, language_code: str) -> str:
    normalized_language = (language_code or "").split("-")[0]
    candidates = [normalized_language, "ru", "kk"]

    for lang in candidates:
        if not lang:
            continue
        value = getattr(obj, f"name_{lang}", None)
        if value:
            return value

    return getattr(obj, "name", str(obj))


def _format_check_time(dt) -> str:
    return timezone.localtime(dt).strftime("%d.%m.%Y %H:%M")


def build_optimal_conditions_i18n(field, culture_variety, operation, prediction_time) -> tuple[dict, dict]:
    title_i18n = {}
    msg_i18n = {}

    for language_code in ("ru", "kk"):
        with translation.override(language_code):
            operation_name = get_translated_name(operation, language_code)
            culture_name = get_translated_name(culture_variety, language_code)
            title_i18n[language_code] = _("Suitable agro operation found")
            msg_i18n[language_code] = _(
                'At %(time)s on field "%(field)s" optimal conditions are met for operation "%(operation)s" for culture variety "%(culture)s".'
            ) % {
                "time": _format_check_time(prediction_time),
                "field": field.no,
                "operation": operation_name,
                "culture": culture_name,
            }

    return title_i18n, msg_i18n
