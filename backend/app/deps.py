from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from .crud.permission import get_role_permission_codes
from .database import get_session
from .models.user import User


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    uid = request.session.get("user_id")
    if uid is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = session.get(User, uid)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def get_current_permission_codes(user: User, session: Session) -> set[str]:
    return get_role_permission_codes(session, user.role_id)


def require_permission(code: str):
    def dependency(
        user: User = Depends(get_current_user),
        session: Session = Depends(get_session),
    ) -> User:
        if code not in get_current_permission_codes(user, session):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        return user

    return dependency


def require_any_permission(codes: list[str]):
    def dependency(
        user: User = Depends(get_current_user),
        session: Session = Depends(get_session),
    ) -> User:
        permission_codes = get_current_permission_codes(user, session)
        if not any(code in permission_codes for code in codes):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        return user

    return dependency


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.name != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
