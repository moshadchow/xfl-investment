from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

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
from ..schemas.user import UserCreate, UserRead, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session), _: User = Depends(require_admin)):
    return get_all_users(session)


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    data: UserCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    username = data.username.strip()
    if get_user_by_username(session, username):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already taken")
    data.username = username
    return create_user(session, data)


@router.patch("/{user_id}", response_model=UserRead)
def update_user_endpoint(
    user_id: int,
    data: UserUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    if not get_user_by_id(session, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    updated = update_user(session, user_id, data.model_dump(exclude_none=True))
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_endpoint(
    user_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account",
        )
    if not delete_user(session, user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
