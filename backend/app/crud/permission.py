from datetime import datetime

from sqlmodel import Session, select

from ..models.permission import Permission
from ..models.role import Role
from ..models.role_permission import RolePermission


PERMISSION_CATALOG = [
    ("roles", "Roles Management", ["view", "create", "update", "delete"]),
    ("users", "User Management", ["view", "create", "update", "delete"]),
    ("companies", "Asset Management Companies", ["view", "create", "update", "delete", "approve"]),
    ("investment_types", "Investment Types", ["view", "create", "update", "delete"]),
    ("investments", "Investments", ["view", "create", "update", "delete", "approve"]),
    ("investment_details", "Investment Details", ["view", "create", "update", "delete", "approve"]),
]

ACTION_LABELS = {
    "view": "View Menu",
    "create": "Create",
    "update": "Update/Edit",
    "delete": "Delete",
    "approve": "Approve",
}


def _permission_definitions() -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for menu_key, menu_label, actions in PERMISSION_CATALOG:
        for action in actions:
            items.append(
                {
                    "code": f"{menu_key}.{action}",
                    "menu_key": menu_key,
                    "action": action,
                    "label": f"{menu_label}: {ACTION_LABELS[action]}",
                    "description": f"Allows {ACTION_LABELS[action].lower()} for {menu_label}.",
                }
            )
    return items


def seed_permissions(session: Session) -> None:
    existing_by_code = {
        permission.code: permission
        for permission in session.exec(select(Permission)).all()
    }
    for item in _permission_definitions():
        permission = existing_by_code.get(item["code"])
        if permission:
            changed = False
            for key, value in item.items():
                if getattr(permission, key) != value:
                    setattr(permission, key, value)
                    changed = True
            if changed:
                permission.updated_at = datetime.utcnow()
                session.add(permission)
        else:
            session.add(Permission(**item))
    session.commit()

    admin_role = session.exec(select(Role).where(Role.name == "admin")).first()
    if not admin_role:
        return

    permissions = session.exec(select(Permission).where(Permission.is_active == True)).all()  # noqa: E712
    existing_grants = {
        grant.permission_id
        for grant in session.exec(select(RolePermission).where(RolePermission.role_id == admin_role.id)).all()
    }
    for permission in permissions:
        if permission.id not in existing_grants:
            session.add(RolePermission(role_id=admin_role.id, permission_id=permission.id))
    session.commit()


def get_permissions(session: Session, active_only: bool = True) -> list[Permission]:
    statement = select(Permission).order_by(Permission.menu_key, Permission.action)
    if active_only:
        statement = statement.where(Permission.is_active == True)  # noqa: E712
    return list(session.exec(statement).all())


def get_role_permission_codes(session: Session, role_id: int) -> set[str]:
    statement = (
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id, Permission.is_active == True)  # noqa: E712
    )
    return set(session.exec(statement).all())


def get_role_permissions(session: Session, role_id: int) -> list[Permission]:
    statement = (
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role_id, Permission.is_active == True)  # noqa: E712
        .order_by(Permission.menu_key, Permission.action)
    )
    return list(session.exec(statement).all())


def replace_role_permissions(session: Session, role_id: int, permission_ids: list[int]) -> list[Permission]:
    unique_permission_ids = sorted(set(permission_ids))
    if unique_permission_ids:
        permissions = session.exec(
            select(Permission).where(
                Permission.id.in_(unique_permission_ids),
                Permission.is_active == True,  # noqa: E712
            )
        ).all()
        found_ids = {permission.id for permission in permissions}
        missing = set(unique_permission_ids) - found_ids
        if missing:
            raise ValueError("Permission not found")
    else:
        permissions = []

    existing = session.exec(select(RolePermission).where(RolePermission.role_id == role_id)).all()
    existing_by_permission_id = {grant.permission_id: grant for grant in existing}
    requested_ids = set(unique_permission_ids)

    for permission_id, grant in existing_by_permission_id.items():
        if permission_id not in requested_ids:
            session.delete(grant)
    for permission_id in unique_permission_ids:
        if permission_id not in existing_by_permission_id:
            session.add(RolePermission(role_id=role_id, permission_id=permission_id))
    session.commit()
    return get_role_permissions(session, role_id)


def user_has_permission(session: Session, role_id: int, code: str) -> bool:
    return code in get_role_permission_codes(session, role_id)
