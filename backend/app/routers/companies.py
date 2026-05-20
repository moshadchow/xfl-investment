from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from ..crud.company import (
    create_company,
    delete_company,
    get_all_companies,
    update_company,
)
from ..database import get_session
from ..deps import get_current_user, require_admin
from ..models.user import User
from ..schemas.company import CompanyCreate, CompanyRead

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=list[CompanyRead])
def list_companies(
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    return get_all_companies(session)


@router.get("/list", response_model=list[CompanyRead])
def list_companies_public(
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    """Lightweight endpoint for authenticated users (company filter dropdown)."""
    return get_all_companies(session)


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company_endpoint(
    data: CompanyCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    try:
        return create_company(session, data)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company with this name already exists",
        )


@router.put("/{company_id}", response_model=CompanyRead)
def update_company_endpoint(
    company_id: int,
    data: CompanyCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    try:
        result = update_company(session, company_id, data)
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company with this name already exists",
        )
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return result


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company_endpoint(
    company_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    result = delete_company(session, company_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete company with associated fund entries",
        )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
