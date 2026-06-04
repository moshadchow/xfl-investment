from datetime import datetime
from typing import Optional

from sqlmodel import Session, col, func, or_, select

from ..models.company import AssetManagementCompany
from ..models.investment import Investment
from ..models.investment_type import InvestmentType
from ..schemas.investment_type import (
    InvestmentTypeCreate,
    InvestmentTypeList,
    InvestmentTypeRead,
    InvestmentTypeUpdate,
)

_SORT_COLUMNS = {
    "investment_type_name": InvestmentType.investment_type_name,
    "created_at": InvestmentType.created_at,
    "updated_at": InvestmentType.updated_at,
}


def _clean_text(value: str) -> str:
    return value.strip()


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _to_read(item: InvestmentType, session: Session) -> InvestmentTypeRead:
    session.refresh(item, attribute_names=["company"])
    return InvestmentTypeRead(
        id=item.id,
        asset_management_company_id=item.asset_management_company_id,
        asset_management_company_name=item.company.name if item.company else None,
        investment_type_name=item.investment_type_name,
        description=item.description,
        is_active=item.is_active,
        created_by=item.created_by,
        updated_by=item.updated_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _validate_company(session: Session, company_id: int) -> AssetManagementCompany:
    company = session.get(AssetManagementCompany, company_id)
    if not company:
        raise ValueError("Company not found")
    if not company.is_active:
        raise ValueError("Company is inactive")
    return company


def _duplicate_name(
    session: Session,
    company_id: int,
    investment_type_name: str,
    exclude_id: Optional[int] = None,
) -> bool:
    normalized_name = _normalize_text(investment_type_name)
    statement = select(InvestmentType).where(
        InvestmentType.asset_management_company_id == company_id,
    )
    if exclude_id is not None:
        statement = statement.where(InvestmentType.id != exclude_id)
    return any(
        _normalize_text(item.investment_type_name) == normalized_name
        for item in session.exec(statement).all()
    )


def get_investment_types(
    session: Session,
    *,
    search: Optional[str] = None,
    asset_management_company_id: Optional[int] = None,
    investment_type_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = "investment_type_name",
    sort_dir: str = "asc",
    page: int = 1,
    page_size: int = 10,
) -> InvestmentTypeList:
    statement = select(InvestmentType)
    count_statement = select(func.count()).select_from(InvestmentType)
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                col(InvestmentType.investment_type_name).like(term),
                col(InvestmentType.description).like(term),
            )
        )
    if asset_management_company_id is not None:
        filters.append(InvestmentType.asset_management_company_id == asset_management_company_id)
    if investment_type_name:
        filters.append(InvestmentType.investment_type_name == _clean_text(investment_type_name))
    if is_active is not None:
        filters.append(InvestmentType.is_active == is_active)
    for item_filter in filters:
        statement = statement.where(item_filter)
        count_statement = count_statement.where(item_filter)

    sort_column = _SORT_COLUMNS.get(sort_by, InvestmentType.investment_type_name)
    if sort_dir == "desc":
        sort_column = sort_column.desc()
    statement = statement.order_by(sort_column)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = session.exec(count_statement).one()
    rows = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return InvestmentTypeList(
        items=[_to_read(item, session) for item in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_investment_type_by_id(
    session: Session,
    investment_type_id: int,
) -> InvestmentType | None:
    return session.get(InvestmentType, investment_type_id)


def create_investment_type(
    session: Session,
    data: InvestmentTypeCreate,
    actor_user_id: Optional[int],
) -> InvestmentTypeRead:
    _validate_company(session, data.asset_management_company_id)
    investment_type_name = _clean_text(data.investment_type_name)
    if not investment_type_name:
        raise ValueError("Investment type name is required")
    if _duplicate_name(session, data.asset_management_company_id, investment_type_name):
        raise FileExistsError("Investment type already exists for this company")
    item = InvestmentType(
        asset_management_company_id=data.asset_management_company_id,
        investment_type_name=investment_type_name,
        description=data.description.strip() if data.description else None,
        is_active=data.is_active,
        created_by=actor_user_id,
        updated_by=actor_user_id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_read(item, session)


def update_investment_type(
    session: Session,
    investment_type_id: int,
    data: InvestmentTypeUpdate,
    actor_user_id: Optional[int],
) -> InvestmentTypeRead | None:
    item = session.get(InvestmentType, investment_type_id)
    if not item:
        return None
    investment_type_name = _clean_text(data.investment_type_name)
    if not investment_type_name:
        raise ValueError("Investment type name is required")
    if _duplicate_name(session, item.asset_management_company_id, investment_type_name, investment_type_id):
        raise FileExistsError("Investment type already exists for this company")
    item.investment_type_name = investment_type_name
    item.description = data.description.strip() if data.description else None
    item.is_active = data.is_active
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def update_investment_type_status(
    session: Session,
    investment_type_id: int,
    is_active: bool,
    actor_user_id: Optional[int],
) -> InvestmentTypeRead | None:
    item = session.get(InvestmentType, investment_type_id)
    if not item:
        return None
    item.is_active = is_active
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def delete_investment_type(session: Session, investment_type_id: int) -> bool | None:
    item = session.get(InvestmentType, investment_type_id)
    if not item:
        return False
    has_investments = session.exec(
        select(Investment).where(Investment.investment_type_id == investment_type_id)
    ).first()
    if has_investments:
        return None
    session.delete(item)
    session.commit()
    return True
