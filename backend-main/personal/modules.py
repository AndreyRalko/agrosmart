from django.utils.translation import gettext_lazy as _

MODULES = (
    ("dashboard", _("Dashboard")),
    ("persons", _("Persons")),
    ("departments", _("Departments")),
    ("positions", _("Positions")),
    ("fields", _("Fields")),
    ("integration", _("Integrations")),
    ("culture", _("Cultures")),
    ("fertilizer", _("Fertilizers")),
    ("tasks", _("Tasks")),
    ("ndvi", _("NDVI monitoring")),
    ("agro_operations", _("Agro operations")),
    ("notification", _("Notifications")),
    ("machinery", _("Machinery")),
    ("animal", _("Animals")),
    ("storage", _("Feed storage")),
    ("ration", _("Feeding rations")),
)

MODULE_KEYS = {key for key, _ in MODULES}

PATH_PREFIX_MODULE_MAP = (
    ("dashboard/", "dashboard"),
    ("personal/", "persons"),
    ("department/", "departments"),
    ("position/", "positions"),
    ("field/", "fields"),
    ("integration", "integration"),
    ("culture-custom/", "culture"),
    ("culture/", "culture"),
    ("fertilizer/", "fertilizer"),
    ("task/", "tasks"),
    ("transportation/", "tasks"),
    ("api/ndvi/", "ndvi"),
    ("agro-op/", "agro_operations"),
    ("notification/", "notification"),
    ("machinery/", "machinery"),
    ("animal/", "animal"),
    ("api/storage/", "storage"),
    ("api/ration/", "ration"),
)


def resolve_module_from_path(path: str) -> str | None:
    normalized = path.lstrip("/")
    for prefix, module_key in PATH_PREFIX_MODULE_MAP:
        if normalized.startswith(prefix):
            return module_key
    return None
