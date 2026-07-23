from rest_framework.permissions import BasePermission

from personal.permissions_service import user_has_module_perm


ACTION_MAP = {
    "list": "view",
    "retrieve": "view",
    "create": "create",
    "update": "edit",
    "partial_update": "edit",
    "destroy": "delete",
}

CUSTOM_ACTION_MAP = {
    "finish": "edit",
    "run_task": "edit",
    "set_conditions": "edit",
    "dose": "view",
    "by_culture_variety": "view",
    "by_culture": "view",
    "last": "view",
}


class ModulePermission(BasePermission):
    message = "Недостаточно прав для выполнения действия."

    def has_permission(self, request, view):
        module_key = getattr(view, "module_key", None)
        if not module_key:
            return True

        action = getattr(view, "action", None)
        if action in CUSTOM_ACTION_MAP:
            perm_action = CUSTOM_ACTION_MAP[action]
        elif action in ACTION_MAP:
            perm_action = ACTION_MAP[action]
        elif request.method == "POST":
            perm_action = "create"
        elif request.method in ("PUT", "PATCH"):
            perm_action = "edit"
        elif request.method == "DELETE":
            perm_action = "delete"
        else:
            perm_action = "view"

        return user_has_module_perm(request.user, module_key, perm_action)
