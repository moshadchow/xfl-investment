from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session

from ..crud.fund_data import (
    create_fund_entry,
    delete_fund_entry,
    get_fund_entries,
    update_fund_entry,
)
from ..database import get_session
from ..deps import require_permission
from ..models.user import User
from ..schemas.fund_data import FundDataCreate, FundDataRead, FundDataUpdate

router = APIRouter(prefix="/fund-data", tags=["fund-data"])


@router.get("", response_model=list[FundDataRead])
def list_fund_entries(
    from_date: date,
    to_date: date,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investment_details.view")),
):
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="to_date must be on or after from_date",
        )
    return get_fund_entries(session, from_date, to_date)


@router.post("", response_model=FundDataRead, status_code=status.HTTP_201_CREATED)
def create_fund_entry_endpoint(
    data: FundDataCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_details.create")),
):
    return create_fund_entry(session, data, created_by=current_user.id)


@router.put("/{entry_id}", response_model=FundDataRead)
def update_fund_entry_endpoint(
    entry_id: int,
    data: FundDataUpdate,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investment_details.update")),
):
    entry = update_fund_entry(session, entry_id, data)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fund_entry_endpoint(
    entry_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investment_details.delete")),
):
    if not delete_fund_entry(session, entry_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
