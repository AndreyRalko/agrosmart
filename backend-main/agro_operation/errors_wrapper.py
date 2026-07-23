from django.utils.translation import gettext_lazy as _

by_culture_variety_set_conditions__msg__not_all_req_fields = _("Not all required fields are present")
def by_culture_variety_set_conditions_not_all_req_fields(fields):
    return {
        "detail": {
            "conditions": {
                "msg": _(by_culture_variety_set_conditions__msg__not_all_req_fields),
                "not_found_fields": [
                    {
                        "id": field.id,
                        "name": field.name
                    } for field in fields
                ]
            }
        }
    }


by_culture_variety_set_conditions__msg__unknown_fields = _("Unknown field to current operation")
def by_culture_variety_set_conditions_unknown_fields(fields):
    return {
        "detail": {
            "conditions": {
                "msg": _(by_culture_variety_set_conditions__msg__unknown_fields),
                "unknown_fields_id": fields
            }
        }
    }

