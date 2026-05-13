from datetime import date

from sqlmodel import Session, select

from ..models.fund_data import FundData
from ..schemas.fund_data import FundDataCreate, FundDataUpdate


def create_fund_entry(
    session: Session, data: FundDataCreate, created_by: int
) -> FundData:
    entry = FundData(
        date=data.date,
        investment=data.investment,
        market_value=data.market_value,
        nav=data.nav,
        created_by=created_by,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def get_fund_entries(
    session: Session, from_date: date, to_date: date
) -> list[FundData]:
    return list(
        session.exec(
            select(FundData).where(
                FundData.date >= from_date,
                FundData.date <= to_date,
            )
        ).all()
    )


def get_fund_entry_by_id(session: Session, entry_id: int) -> FundData | None:
    return session.get(FundData, entry_id)


def update_fund_entry(
    session: Session, entry_id: int, data: FundDataUpdate
) -> FundData | None:
    entry = session.get(FundData, entry_id)
    if not entry:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def delete_fund_entry(session: Session, entry_id: int) -> bool:
    entry = session.get(FundData, entry_id)
    if not entry:
        return False
    session.delete(entry)
    session.commit()
    return True
