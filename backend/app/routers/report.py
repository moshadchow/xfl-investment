from datetime import date

from fastapi import APIRouter, Depends
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
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return get_fund_entries(session, from_date, to_date)
