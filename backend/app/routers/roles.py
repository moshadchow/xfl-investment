from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.permission import (
    get_permissions,
    get_role_permissions,
    replace_role_permissions,
)
from ..crud.role import (
    PROTECTED_ROLE_NAMES,
    count_users_for_role,
    create_role,
    delete_role,
    get_all_roles,
    get_role_by_id,
    get_role_by_name,
    update_role,
)
from ..database import get_session
from ..deps import require_permission
from ..models.user import User
from ..schemas.permission import (
    PermissionGroupRead,
    PermissionRead,
    RolePermissionRead,
    RolePermissionUpdate,
)
from ..schemas.role import RoleCreate, RoleDeleteError, RoleRead, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])

MENU_LABELS = {
    "roles": "Roles Management",
    "users": "User Management",
    "companies": "Asset Management Companies",
    "investment_types": "Investment Types",
    "investments": "Investments",
    "investment_details": "Investment Details",
}


@router.get("", response_model=list[RoleRead])
def list_roles(session: Session = Depends(get_session), _: User = Depends(require_permission("roles.view"))):
    return get_all_roles(session)


@router.get("/permissions", response_model=list[PermissionGroupRead])
def list_permissions(
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("roles.view")),
):
    grouped: dict[str, list[PermissionRead]] = {}
    for permission in get_permissions(session):
        grouped.setdefault(permission.menu_key, []).append(permission)
    return [
        PermissionGroupRead(
            menu_key=menu_key,
            label=MENU_LABELS.get(menu_key, menu_key.replace("_", " ").title()),
            permissions=permissions,
        )
        for menu_key, permissions in grouped.items()
    ]


@router.get("/{role_id}/permissions", response_model=RolePermissionRead)
def get_role_permissions_endpoint(
    role_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("roles.view")),
):
    role = get_role_by_id(session, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return RolePermissionRead(
        role_id=role.id,
        role_name=role.name,
        permissions=get_role_permissions(session, role.id),
    )


@router.put("/{role_id}/permissions", response_model=RolePermissionRead)
def update_role_permissions_endpoint(
    role_id: int,
    data: RolePermissionUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("roles.update")),
):
    role = get_role_by_id(session, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    before = sorted(permission.code for permission in get_role_permissions(session, role.id))
    if role.name == "admin" and not data.permission_ids:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role_permission",
            entity_id=role.id,
            action="update_blocked",
            details={"reason": "admin_requires_permissions"},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin role must keep permissions")

    try:
        permissions = replace_role_permissions(session, role.id, data.permission_ids)
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role_permission",
            entity_id=role.id,
            action="update_failed",
            details={"reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    after = sorted(permission.code for permission in permissions)
    if current_user.role_id == role.id and not {"roles.view", "roles.update"}.issubset(after):
        replace_role_permissions(
            session,
            role.id,
            [permission.id for permission in get_permissions(session) if permission.code in before],
        )
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role_permission",
            entity_id=role.id,
            action="update_blocked",
            details={"reason": "self_lockout", "old": before, "attempted": after},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove your own role management permissions",
        )

    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="role_permission",
        entity_id=role.id,
        action="update",
        details={"old": before, "new": after},
    )
    return RolePermissionRead(role_id=role.id, role_name=role.name, permissions=permissions)


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role_endpoint(
    data: RoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("roles.create")),
):
    name = data.name.strip()
    if get_role_by_name(session, name):
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role",
            entity_id=None,
            action="create_failed",
            details={"name": name, "reason": "duplicate_name"},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists")
    role = create_role(session, name)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="role",
        entity_id=role.id,
        action="create",
        details={"new": {"name": role.name}},
    )
    return role


@router.put("/{role_id}", response_model=RoleRead)
def update_role_endpoint(
    role_id: int,
    data: RoleUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("roles.update")),
):
    role = get_role_by_id(session, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.name in PROTECTED_ROLE_NAMES:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role",
            entity_id=role.id,
            action="update_blocked",
            details={"reason": "protected_role", "name": role.name},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be renamed",
        )

    name = data.name.strip()
    existing = get_role_by_name(session, name)
    if existing and existing.id != role.id:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role",
            entity_id=role.id,
            action="update_failed",
            details={"reason": "duplicate_name", "attempted_name": name},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists")

    previous_name = role.name
    updated = update_role(session, role, name=name)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="role",
        entity_id=updated.id,
        action="update",
        details={"old": {"name": previous_name}, "new": {"name": updated.name}},
    )
    return updated


@router.delete(
    "/{role_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={status.HTTP_409_CONFLICT: {"model": RoleDeleteError}},
)
def delete_role_endpoint(
    role_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("roles.delete")),
):
    role = get_role_by_id(session, role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")

    if role.name in PROTECTED_ROLE_NAMES:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role",
            entity_id=role.id,
            action="delete_blocked",
            details={"reason": "protected_role", "name": role.name},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System roles cannot be deleted",
        )

    assigned_user_count = count_users_for_role(session, role.id)
    if assigned_user_count:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="role",
            entity_id=role.id,
            action="delete_blocked",
            details={"reason": "role_in_use", "assigned_user_count": assigned_user_count},
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a role assigned to users",
        )

    role_name = role.name
    delete_role(session, role)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="role",
        entity_id=role_id,
        action="delete",
        details={"old": {"name": role_name}},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
