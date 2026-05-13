from fastapi import Depends, HTTPException, Request, status
from sqlmodel import Session

from .database import get_session


def get_current_user(request: Request, session: Session = Depends(get_session)):
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
    )


def require_admin(user=Depends(get_current_user)):
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Admin access required",
    )
