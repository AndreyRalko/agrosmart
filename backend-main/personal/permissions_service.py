from __future__ import annotations

from django.contrib.auth.models import User

from personal.models import Person, Position, PositionModulePermission
from personal.modules import MODULES, MODULE_KEYS


def get_default_permissions_list() -> list[dict]:
    return [
        {
            "module": module_key,
            "can_view": True,
            "can_create": False,
            "can_edit": False,
            "can_delete": False,
        }
        for module_key, _ in MODULES
    ]


def serialize_position_permissions(position: Position) -> list[dict]:
    stored = list(position.module_permissions.all())
    if not stored:
        return get_default_permissions_list()

    by_module = {item.module: item for item in stored}
    result = []
    for module_key, _ in MODULES:
        perm = by_module.get(module_key)
        if perm is None:
            result.append(
                {
                    "module": module_key,
                    "can_view": False,
                    "can_create": False,
                    "can_edit": False,
                    "can_delete": False,
                }
            )
            continue
        result.append(
            {
                "module": perm.module,
                "can_view": perm.can_view,
                "can_create": perm.can_create,
                "can_edit": perm.can_edit,
                "can_delete": perm.can_delete,
            }
        )
    return result


def sync_position_permissions(position: Position, permissions_data: list[dict] | None) -> None:
    if permissions_data is None:
        permissions_data = get_default_permissions_list()

    PositionModulePermission.objects.filter(position=position).delete()
    to_create = []
    for item in permissions_data:
        module = item.get("module")
        if module not in MODULE_KEYS:
            continue
        to_create.append(
            PositionModulePermission(
                position=position,
                module=module,
                can_view=bool(item.get("can_view", False)),
                can_create=bool(item.get("can_create", False)),
                can_edit=bool(item.get("can_edit", False)),
                can_delete=bool(item.get("can_delete", False)),
            )
        )
    if to_create:
        PositionModulePermission.objects.bulk_create(to_create)


def get_user_person(user: User) -> Person | None:
    if not user or not user.is_authenticated:
        return None
    try:
        return Person.objects.select_related("position").get(user=user)
    except Person.DoesNotExist:
        return None


def position_has_unrestricted_access(position: Position) -> bool:
    return not position.module_permissions.exists()


def user_has_module_perm(user: User, module: str, action: str = "view") -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True

    person = get_user_person(user)
    if person is None:
        return False
    if person.status == Person.Status.FIRED:
        return False

    position = person.position
    if position_has_unrestricted_access(position):
        return True

    perm = position.module_permissions.filter(module=module).first()
    if perm is None:
        return False

    action_field = {
        "view": "can_view",
        "create": "can_create",
        "edit": "can_edit",
        "delete": "can_delete",
    }.get(action, "can_view")
    return bool(getattr(perm, action_field, False))


def build_user_permissions_response(user: User) -> dict:
    person = get_user_person(user)
    modules_payload = {}

    if user.is_superuser:
        for module_key, _ in MODULES:
            modules_payload[module_key] = {
                "view": True,
                "create": True,
                "edit": True,
                "delete": True,
            }
    elif person is None:
        for module_key, _ in MODULES:
            modules_payload[module_key] = {
                "view": False,
                "create": False,
                "edit": False,
                "delete": False,
            }
    elif position_has_unrestricted_access(person.position):
        for module_key, _ in MODULES:
            modules_payload[module_key] = {
                "view": True,
                "create": True,
                "edit": True,
                "delete": True,
            }
    else:
        by_module = {item.module: item for item in person.position.module_permissions.all()}
        for module_key, _ in MODULES:
            perm = by_module.get(module_key)
            modules_payload[module_key] = {
                "view": bool(perm.can_view) if perm else False,
                "create": bool(perm.can_create) if perm else False,
                "edit": bool(perm.can_edit) if perm else False,
                "delete": bool(perm.can_delete) if perm else False,
            }

    position_payload = None
    if person is not None:
        position_payload = {
            "id": person.position_id,
            "name_ru": person.position.name_ru or person.position.name,
            "name_kk": person.position.name_kk or person.position.name,
        }

    return {
        "is_superuser": bool(user.is_superuser),
        "position": position_payload,
        "modules": modules_payload,
        "module_registry": [
            {"key": module_key, "label": str(label)}
            for module_key, label in MODULES
        ],
    }
