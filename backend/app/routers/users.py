from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.role import get_role_by_id
from ..crud.user import (
    create_user,
    delete_user,
    get_all_users,
    get_user_by_id,
    get_user_by_username,
    update_user,
)
from ..database import get_session
from ..deps import require_admin
from ..models.user import User
from ..schemas.user import UserCreate, UserPut, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session), _: User = Depends(require_admin)):
    return get_all_users(session)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    data: UserCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    username = data.username.strip()
    if get_user_by_username(session, username):
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=None,
            action="create_failed",
            details={"username": username, "reason": "duplicate_username"},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    if not get_role_by_id(session, data.role_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
    data.username = username
    created = create_user(session, data)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=created.id,
        action="create",
        details={
            "new": {
                "username": created.username,
                "role_id": created.role_id,
                "is_active": created.is_active,
            }
        },
    )
    return created


@router.put("/{user_id}", response_model=UserRead)
def replace_user_endpoint(
    user_id: int,
    data: UserPut,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    user = get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    username = data.username.strip()
    existing = get_user_by_username(session, username)
    if existing and existing.id != user.id:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=user.id,
            action="update_failed",
            details={"reason": "duplicate_username", "attempted_username": username},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")

    target_role = get_role_by_id(session, data.role_id)
    if not target_role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")

    if current_user.id == user.id and target_role.name != "admin":
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=user.id,
            action="update_blocked",
            details={"reason": "self_role_change", "target_role": target_role.name},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin access",
        )

    if current_user.id == user.id and not data.is_active:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=user.id,
            action="update_blocked",
            details={"reason": "self_deactivate"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    previous = {
        "username": user.username,
        "role_id": user.role_id,
        "is_active": user.is_active,
    }
    payload = {
        "username": username,
        "role_id": data.role_id,
        "is_active": data.is_active,
    }
    if data.password:
        payload["password"] = data.password

    updated = update_user(session, user, payload)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=updated.id,
        action="update",
        details={
            "old": previous,
            "new": {
                "username": updated.username,
                "role_id": updated.role_id,
                "is_active": updated.is_active,
                "password_changed": bool(data.password),
            },
        },
    )
    return updated


@router.patch("/{user_id}", response_model=UserRead)
def update_user_endpoint(
    user_id: int,
    data: UserUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    user = get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    updates = data.model_dump(exclude_none=True)
    if "username" in updates:
        username = updates["username"].strip()
        existing = get_user_by_username(session, username)
        if existing and existing.id != user.id:
            create_audit_log(
                session,
                actor_user_id=current_user.id,
                entity_type="user",
                entity_id=user.id,
                action="update_failed",
                details={"reason": "duplicate_username", "attempted_username": username},
            )
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
        updates["username"] = username

    if "role_id" in updates:
        target_role = get_role_by_id(session, updates["role_id"])
        if not target_role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found")
        if current_user.id == user.id and target_role.name != "admin":
            create_audit_log(
                session,
                actor_user_id=current_user.id,
                entity_type="user",
                entity_id=user.id,
                action="update_blocked",
                details={"reason": "self_role_change", "target_role": target_role.name},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove your own admin access",
            )

    if current_user.id == user.id and updates.get("is_active") is False:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=user.id,
            action="update_blocked",
            details={"reason": "self_deactivate"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    previous = {
        "username": user.username,
        "role_id": user.role_id,
        "is_active": user.is_active,
    }
    updated = update_user(session, user, updates)
    details = {
        "old": previous,
        "new": {
            "username": updated.username,
            "role_id": updated.role_id,
            "is_active": updated.is_active,
        },
    }
    if "password" in updates:
        details["new"]["password_changed"] = True
    if "is_active" in updates:
        details["status_change"] = "activated" if updated.is_active else "deactivated"
    if "role_id" in updates:
        details["role_changed"] = True
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=updated.id,
        action="update",
        details=details,
    )
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    target_user = get_user_by_id(session, user_id)
    if current_user.id == user_id:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="user",
            entity_id=user_id,
            action="delete_blocked",
            details={"reason": "self_delete"},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    username = target_user.username
    if not delete_user(session, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="user",
        entity_id=user_id,
        action="delete",
        details={"old": {"username": username}},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
