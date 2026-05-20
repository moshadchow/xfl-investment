from datetime import date

from sqlmodel import Session, select

from ..models.fund_data import FundData
from ..schemas.fund_data import FundDataCreate, FundDataRead, FundDataUpdate

_COLUMNS = ["id", "date", "investment", "market_value", "nav", "created_by", "company_id"]


def _to_read(entry: FundData, session: Session) -> FundDataRead:
    """Serialize ORM entry to FundDataRead without triggering lazy loads."""
    session.refresh(entry, attribute_names=_COLUMNS + ["company"])
    company_name = entry.company.name if entry.company else None
    data = {c: getattr(entry, c) for c in _COLUMNS}
    data["company_name"] = company_name
    return FundDataRead.model_validate(data)


def create_fund_entry(
    session: Session, data: FundDataCreate, created_by: int
) -> FundDataRead:
    entry = FundData(
        date=data.date,
        investment=data.investment,
        market_value=data.market_value,
        nav=data.nav,
        created_by=created_by,
        company_id=data.company_id,
    )
    session.add(entry)
    session.commit()
    return _to_read(entry, session)


def get_fund_entries(
    session: Session, from_date: date, to_date: date, company_id: int | None = None
) -> list[FundDataRead]:
    stmt = select(FundData).where(
        FundData.date >= from_date,
        FundData.date <= to_date,
    )
    if company_id is not None:
        stmt = stmt.where(FundData.company_id == company_id)
    results = session.exec(stmt).all()
    return [_to_read(e, session) for e in results]


def get_fund_entry_by_id(session: Session, entry_id: int) -> FundData | None:
    return session.get(FundData, entry_id)


def update_fund_entry(
    session: Session, entry_id: int, data: FundDataUpdate
) -> FundDataRead | None:
    entry = session.get(FundData, entry_id)
    if not entry:
        return None
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    return _to_read(entry, session)


def delete_fund_entry(session: Session, entry_id: int) -> bool:
    entry = session.get(FundData, entry_id)
    if not entry:
        return False
    session.delete(entry)
    session.commit()
    return True
