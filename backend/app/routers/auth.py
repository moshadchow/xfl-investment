from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from ..crud.permission import get_role_permission_codes
from ..crud.user import get_user_by_username, verify_password
from ..database import get_session
from ..deps import get_current_user
from ..models.user import User
from ..schemas.auth import LoginRequest
from ..schemas.user import UserWithRole

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_with_role(user: User, session: Session) -> UserWithRole:
    return UserWithRole(
        id=user.id,
        username=user.username,
        is_active=user.is_active,
        role=user.role,
        permissions=sorted(get_role_permission_codes(session, user.role_id)),
    )


@router.post("/login", response_model=UserWithRole)
def login(data: LoginRequest, request: Request, session: Session = Depends(get_session)):
    user = get_user_by_username(session, data.username)
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    request.session["user_id"] = user.id
    return _to_user_with_role(user, session)


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"detail": "logged out"}


@router.get("/me", response_model=UserWithRole)
def me(user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return _to_user_with_role(user, session)
