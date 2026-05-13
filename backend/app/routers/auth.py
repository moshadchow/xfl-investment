from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session

from ..crud.user import get_user_by_username, verify_password
from ..database import get_session
from ..deps import get_current_user
from ..models.user import User
from ..schemas.auth import LoginRequest
from ..schemas.user import UserRead, UserWithRole

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserRead)
def login(data: LoginRequest, request: Request, session: Session = Depends(get_session)):
    user = get_user_by_username(session, data.username)
    if user is None or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    request.session["user_id"] = user.id
    return user


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"detail": "logged out"}


@router.get("/me", response_model=UserWithRole)
def me(user: User = Depends(get_current_user)):
    return user
