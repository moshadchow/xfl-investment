from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Session, col, func, or_, select

from ..models.investment import Investment
from ..models.investment_detail import InvestmentDetail
from ..schemas.investment_detail import (
    InvestmentDetailCreate,
    InvestmentDetailInvestmentOptionRead,
    InvestmentDetailList,
    InvestmentDetailRead,
    InvestmentDetailUpdate,
)

_SORT_COLUMNS = {
    "investment_date": InvestmentDetail.investment_date,
    "investment_amount": InvestmentDetail.investment_amount,
    "market_value": InvestmentDetail.market_value,
    "nav": InvestmentDetail.nav,
    "gain_loss": InvestmentDetail.gain_loss,
    "created_at": InvestmentDetail.created_at,
    "updated_at": InvestmentDetail.updated_at,
}


def _calculate_gain_loss(market_value: Decimal, investment_amount: Decimal) -> Decimal:
    return market_value - investment_amount


def _validate_investment(session: Session, investment_id: int) -> Investment:
    investment = session.get(Investment, investment_id)
    if not investment:
        raise ValueError("Investment not found")
    return investment


def _to_read(item: InvestmentDetail, session: Session) -> InvestmentDetailRead:
    investment = session.get(Investment, item.investment_id)
    company = investment.company if investment else None
    investment_type = investment.investment_type if investment else None
    return InvestmentDetailRead(
        id=item.id,
        investment_id=item.investment_id,
        investment_code=investment.investment_code if investment else "",
        asset_management_company_id=investment.asset_management_company_id if investment else 0,
        asset_management_company_name=company.name if company else None,
        investment_type_id=investment.investment_type_id if investment else 0,
        investment_type_name=investment_type.investment_type_name if investment_type else "",
        investment_date=item.investment_date,
        investment_amount=item.investment_amount,
        market_value=item.market_value,
        nav=item.nav,
        gain_loss=item.gain_loss,
        created_by=item.created_by,
        updated_by=item.updated_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _duplicate_detail(
    session: Session,
    investment_id: int,
    investment_date: date,
    exclude_id: Optional[int] = None,
) -> bool:
    statement = select(InvestmentDetail).where(
        InvestmentDetail.investment_id == investment_id,
        InvestmentDetail.investment_date == investment_date,
    )
    if exclude_id is not None:
        statement = statement.where(InvestmentDetail.id != exclude_id)
    return session.exec(statement).first() is not None


def get_investment_detail_by_id(
    session: Session,
    investment_detail_id: int,
) -> InvestmentDetail | None:
    return session.get(InvestmentDetail, investment_detail_id)


def get_investment_options_for_details(
    session: Session,
    *,
    asset_management_company_id: int,
    investment_type_id: int,
) -> list[InvestmentDetailInvestmentOptionRead]:
    statement = (
        select(Investment)
        .where(
            Investment.asset_management_company_id == asset_management_company_id,
            Investment.investment_type_id == investment_type_id,
            Investment.status.in_(["active", "pending"]),
        )
        .order_by(Investment.investment_code)
    )
    rows = session.exec(statement).all()
    return [
        InvestmentDetailInvestmentOptionRead(
            id=item.id,
            investment_code=item.investment_code,
            investment_amount=item.investment_amount,
            purchase_date=item.purchase_date,
            purchase_units=item.purchase_units,
            status=item.status,
        )
        for item in rows
    ]


def get_investment_details(
    session: Session,
    *,
    search: Optional[str] = None,
    asset_management_company_id: Optional[int] = None,
    investment_type_id: Optional[int] = None,
    investment_id: Optional[int] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    sort_by: str = "investment_date",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 10,
) -> InvestmentDetailList:
    statement = select(InvestmentDetail).join(Investment)
    count_statement = select(func.count()).select_from(InvestmentDetail).join(Investment)
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(or_(col(Investment.investment_code).like(term)))
    if asset_management_company_id is not None:
        filters.append(Investment.asset_management_company_id == asset_management_company_id)
    if investment_type_id is not None:
        filters.append(Investment.investment_type_id == investment_type_id)
    if investment_id is not None:
        filters.append(InvestmentDetail.investment_id == investment_id)
    if from_date is not None:
        filters.append(InvestmentDetail.investment_date >= from_date)
    if to_date is not None:
        filters.append(InvestmentDetail.investment_date <= to_date)

    for item_filter in filters:
        statement = statement.where(item_filter)
        count_statement = count_statement.where(item_filter)

    sort_column = _SORT_COLUMNS.get(sort_by, InvestmentDetail.investment_date)
    if sort_dir == "desc":
        sort_column = sort_column.desc()
    statement = statement.order_by(sort_column)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = session.exec(count_statement).one()
    rows = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return InvestmentDetailList(
        items=[_to_read(item, session) for item in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def create_investment_detail(
    session: Session,
    data: InvestmentDetailCreate,
    actor_user_id: Optional[int],
) -> InvestmentDetailRead:
    investment = _validate_investment(session, data.investment_id)
    if _duplicate_detail(session, data.investment_id, data.investment_date):
        raise FileExistsError("Investment detail already exists for this investment date")
    item = InvestmentDetail(
        investment_id=data.investment_id,
        investment_date=data.investment_date,
        investment_amount=investment.investment_amount,
        market_value=data.market_value,
        nav=data.nav,
        gain_loss=_calculate_gain_loss(data.market_value, investment.investment_amount),
        created_by=actor_user_id,
        updated_by=actor_user_id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_read(item, session)


def update_investment_detail(
    session: Session,
    investment_detail_id: int,
    data: InvestmentDetailUpdate,
    actor_user_id: Optional[int],
) -> InvestmentDetailRead | None:
    item = session.get(InvestmentDetail, investment_detail_id)
    if not item:
        return None
    investment = _validate_investment(session, item.investment_id)
    if _duplicate_detail(session, item.investment_id, data.investment_date, investment_detail_id):
        raise FileExistsError("Investment detail already exists for this investment date")
    item.investment_date = data.investment_date
    item.investment_amount = investment.investment_amount
    item.market_value = data.market_value
    item.nav = data.nav
    item.gain_loss = _calculate_gain_loss(data.market_value, investment.investment_amount)
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def delete_investment_detail(session: Session, investment_detail_id: int) -> bool:
    item = session.get(InvestmentDetail, investment_detail_id)
    if not item:
        return False
    session.delete(item)
    session.commit()
    return True
