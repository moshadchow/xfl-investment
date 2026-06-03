from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
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
from ..deps import require_admin
from ..models.user import User
from ..schemas.role import RoleCreate, RoleDeleteError, RoleRead, RoleUpdate

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleRead])
def list_roles(session: Session = Depends(get_session), _: User = Depends(require_admin)):
    return get_all_roles(session)


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role_endpoint(
    data: RoleCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
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
    current_user: User = Depends(require_admin),
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
    current_user: User = Depends(require_admin),
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
