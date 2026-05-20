from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from ..crud.fund_data import get_fund_entries
from ..database import get_session
from ..deps import get_current_user
from ..models.user import User
from ..schemas.fund_data import FundDataRead

router = APIRouter(prefix="/report", tags=["report"])


@router.get("", response_model=list[FundDataRead])
def get_report(
    from_date: date,
    to_date: date,
    company_id: Optional[int] = Query(default=None),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    if to_date < from_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="to_date must be on or after from_date",
        )
    return get_fund_entries(session, from_date, to_date, company_id=company_id)
