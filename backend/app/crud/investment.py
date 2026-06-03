from datetime import datetime
from typing import Optional

from sqlalchemy import inspect
from sqlmodel import Session, col, func, or_, select, text

from ..models.company import AssetManagementCompany
from ..models.investment import Investment
from ..models.sub_investment_type import SubInvestmentType
from ..schemas.investment import (
    InvestmentCreate,
    InvestmentList,
    InvestmentRead,
    InvestmentTypeOptionRead,
    InvestmentUpdate,
    SubInvestmentTypeOptionRead,
)

_ALLOWED_STATUSES = {"active", "pending", "redeemed", "closed"}
_SORT_COLUMNS = {
    "investment_type": Investment.investment_type,
    "purchase_date": Investment.purchase_date,
    "purchase_units": Investment.purchase_units,
    "investment_amount": Investment.investment_amount,
    "status": Investment.status,
    "created_at": Investment.created_at,
    "updated_at": Investment.updated_at,
}


def _clean_text(value: str) -> str:
    return value.strip()


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _clean_code(value: str) -> str:
    return value.strip().upper()


def _generate_investment_code(investment_id: int) -> str:
    return f"INV-{investment_id:06d}"


def _validate_status(value: str) -> str:
    status = _normalize_text(value)
    if not status:
        raise ValueError("Status is required")
    if status not in _ALLOWED_STATUSES:
        raise ValueError("Status must be one of: active, pending, redeemed, closed")
    return status


def _validate_company(session: Session, company_id: int) -> AssetManagementCompany:
    company = session.get(AssetManagementCompany, company_id)
    if not company:
        raise ValueError("Company not found")
    if not company.is_active:
        raise ValueError("Company is inactive")
    return company


def _validate_sub_investment_type(
    session: Session,
    *,
    company_id: int,
    investment_type: str,
    sub_investment_type_id: int,
) -> SubInvestmentType:
    item = session.get(SubInvestmentType, sub_investment_type_id)
    if not item:
        raise ValueError("Sub-investment type not found")
    if not item.is_active:
        raise ValueError("Sub-investment type is inactive")
    if item.asset_management_company_id != company_id:
        raise ValueError("Sub-investment type does not belong to the selected company")
    if item.investment_type_normalized != _normalize_text(investment_type):
        raise ValueError("Sub-investment type does not match the selected investment type")
    return item


def _to_read(item: Investment, session: Session) -> InvestmentRead:
    session.refresh(item, attribute_names=["company", "sub_investment_type"])
    return InvestmentRead(
        id=item.id,
        investment_code=item.investment_code,
        asset_management_company_id=item.asset_management_company_id,
        asset_management_company_name=item.company.name if item.company else None,
        investment_type=item.investment_type,
        sub_investment_type_id=item.sub_investment_type_id,
        sub_investment_type_name=item.sub_investment_type.name if item.sub_investment_type else None,
        purchase_date=item.purchase_date,
        purchase_units=item.purchase_units,
        investment_amount=item.investment_amount,
        reference_number=item.reference_number,
        remarks=item.remarks,
        status=item.status,
        created_by=item.created_by,
        updated_by=item.updated_by,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _duplicate_code(session: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    statement = select(Investment).where(Investment.investment_code == code)
    if exclude_id is not None:
        statement = statement.where(Investment.id != exclude_id)
    return session.exec(statement).first() is not None


def get_investment_by_id(session: Session, investment_id: int) -> Investment | None:
    return session.get(Investment, investment_id)


def get_investment_types_for_company(
    session: Session,
    company_id: int,
) -> list[InvestmentTypeOptionRead]:
    statement = (
        select(SubInvestmentType.investment_type, SubInvestmentType.investment_type_normalized)
        .where(
            SubInvestmentType.asset_management_company_id == company_id,
            SubInvestmentType.is_active == True,
        )
        .group_by(SubInvestmentType.investment_type, SubInvestmentType.investment_type_normalized)
        .order_by(SubInvestmentType.investment_type)
    )
    rows = session.exec(statement).all()
    return [
        InvestmentTypeOptionRead(value=row[0], label=row[0])
        for row in rows
        if row[1]
    ]


def get_sub_investment_type_options(
    session: Session,
    *,
    company_id: int,
    investment_type: str,
) -> list[SubInvestmentTypeOptionRead]:
    statement = (
        select(SubInvestmentType)
        .where(
            SubInvestmentType.asset_management_company_id == company_id,
            SubInvestmentType.investment_type_normalized == _normalize_text(investment_type),
            SubInvestmentType.is_active == True,
        )
        .order_by(SubInvestmentType.name)
    )
    rows = session.exec(statement).all()
    return [
        SubInvestmentTypeOptionRead(
            id=item.id,
            name=item.name,
            code=item.code,
            investment_type=item.investment_type,
        )
        for item in rows
    ]


def get_investments(
    session: Session,
    *,
    search: Optional[str] = None,
    asset_management_company_id: Optional[int] = None,
    investment_type: Optional[str] = None,
    sub_investment_type_id: Optional[int] = None,
    status: Optional[str] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 10,
) -> InvestmentList:
    statement = select(Investment)
    count_statement = select(func.count()).select_from(Investment)
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                col(Investment.reference_number).like(term),
                col(Investment.investment_type).like(term),
                col(Investment.remarks).like(term),
            )
        )
    if asset_management_company_id is not None:
        filters.append(Investment.asset_management_company_id == asset_management_company_id)
    if investment_type:
        filters.append(Investment.investment_type_normalized == _normalize_text(investment_type))
    if sub_investment_type_id is not None:
        filters.append(Investment.sub_investment_type_id == sub_investment_type_id)
    if status:
        filters.append(Investment.status == _validate_status(status))

    for item_filter in filters:
        statement = statement.where(item_filter)
        count_statement = count_statement.where(item_filter)

    sort_column = _SORT_COLUMNS.get(sort_by, Investment.created_at)
    if sort_dir == "desc":
        sort_column = sort_column.desc()
    statement = statement.order_by(sort_column)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = session.exec(count_statement).one()
    rows = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return InvestmentList(
        items=[_to_read(item, session) for item in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def create_investment(
    session: Session,
    data: InvestmentCreate,
    actor_user_id: Optional[int],
) -> InvestmentRead:
    _validate_company(session, data.asset_management_company_id)
    investment_type = _clean_text(data.investment_type)
    investment_type_normalized = _normalize_text(investment_type)
    status = _validate_status(data.status)

    if not investment_type:
        raise ValueError("Investment type is required")

    _validate_sub_investment_type(
        session,
        company_id=data.asset_management_company_id,
        investment_type=investment_type,
        sub_investment_type_id=data.sub_investment_type_id,
    )

    item = Investment(
        investment_code="",
        asset_management_company_id=data.asset_management_company_id,
        investment_type=investment_type,
        investment_type_normalized=investment_type_normalized,
        sub_investment_type_id=data.sub_investment_type_id,
        purchase_date=data.purchase_date,
        purchase_units=data.purchase_units,
        investment_amount=data.investment_amount,
        reference_number=_clean_text(data.reference_number) if data.reference_number else None,
        remarks=_clean_text(data.remarks) if data.remarks else None,
        status=status,
        created_by=actor_user_id,
        updated_by=actor_user_id,
    )
    session.add(item)
    session.flush()

    investment_code = _clean_code(_generate_investment_code(item.id))
    if _duplicate_code(session, investment_code, item.id):
        raise FileExistsError("Generated investment code already exists")

    item.investment_code = investment_code
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_read(item, session)


def update_investment(
    session: Session,
    investment_id: int,
    data: InvestmentUpdate,
    actor_user_id: Optional[int],
) -> InvestmentRead | None:
    item = session.get(Investment, investment_id)
    if not item:
        return None

    _validate_company(session, data.asset_management_company_id)
    investment_type = _clean_text(data.investment_type)
    investment_type_normalized = _normalize_text(investment_type)
    status = _validate_status(data.status)

    if not investment_type:
        raise ValueError("Investment type is required")

    _validate_sub_investment_type(
        session,
        company_id=data.asset_management_company_id,
        investment_type=investment_type,
        sub_investment_type_id=data.sub_investment_type_id,
    )

    item.asset_management_company_id = data.asset_management_company_id
    item.investment_type = investment_type
    item.investment_type_normalized = investment_type_normalized
    item.sub_investment_type_id = data.sub_investment_type_id
    item.purchase_date = data.purchase_date
    item.purchase_units = data.purchase_units
    item.investment_amount = data.investment_amount
    item.reference_number = _clean_text(data.reference_number) if data.reference_number else None
    item.remarks = _clean_text(data.remarks) if data.remarks else None
    item.status = status
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def delete_investment(session: Session, investment_id: int) -> bool | None:
    item = session.get(Investment, investment_id)
    if not item:
        return False

    known_dependency_tables: list[tuple[str, str, bool]] = [
        ("investment_transaction", "investment_id", True),
        ("investment_transactions", "investment_id", True),
        ("customer_investment", "investment_id", False),
        ("customer_investments", "investment_id", False),
        ("portfolio_holding", "investment_id", False),
        ("portfolio_holdings", "investment_id", False),
    ]
    inspector = inspect(session.get_bind())
    table_names = set(inspector.get_table_names())
    for table_name, column_name, active_only in known_dependency_tables:
        if table_name not in table_names:
            continue
        columns = {column["name"] for column in inspector.get_columns(table_name)}
        if column_name not in columns:
            continue
        if active_only and "is_active" in columns:
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :investment_id AND is_active = 1 LIMIT 1"
        elif active_only and "status" in columns:
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :investment_id AND status IN ('active', 'pending', 'open') LIMIT 1"
        else:
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :investment_id LIMIT 1"
        has_reference = session.exec(text(query).bindparams(investment_id=investment_id)).first()
        if has_reference:
            return None

    session.delete(item)
    session.commit()
    return True
