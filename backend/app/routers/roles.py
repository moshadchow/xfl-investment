from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from ..crud.role import create_role, get_all_roles, get_role_by_name
from ..database import get_session
from ..deps import require_admin
from ..models.user import User
from ..schemas.role import RoleCreate, RoleRead

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=list[RoleRead])
def list_roles(session: Session = Depends(get_session), _: User = Depends(require_admin)):
    return get_all_roles(session)


@router.post("", response_model=RoleRead, status_code=status.HTTP_201_CREATED)
def create_role_endpoint(
    data: RoleCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    name = data.name.strip()
    if get_role_by_name(session, name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists")
    return create_role(session, name)
