from datetime import datetime
from typing import Optional

from sqlalchemy import inspect
from sqlmodel import Session, col, func, or_, select, text

from ..models.company import AssetManagementCompany
from ..models.sub_investment_type import SubInvestmentType
from ..schemas.sub_investment_type import (
    SubInvestmentTypeCreate,
    SubInvestmentTypeList,
    SubInvestmentTypeRead,
    SubInvestmentTypeUpdate,
)

_SORT_COLUMNS = {
    "name": SubInvestmentType.name,
    "investment_type": SubInvestmentType.investment_type,
    "code": SubInvestmentType.code,
    "created_at": SubInvestmentType.created_at,
    "updated_at": SubInvestmentType.updated_at,
}


def _clean_text(value: str) -> str:
    return value.strip()


def _normalize_text(value: str) -> str:
    return " ".join(value.strip().casefold().split())


def _clean_code(value: str) -> str:
    return value.strip().upper()


def _to_read(item: SubInvestmentType, session: Session) -> SubInvestmentTypeRead:
    session.refresh(item, attribute_names=["company"])
    return SubInvestmentTypeRead(
        id=item.id,
        asset_management_company_id=item.asset_management_company_id,
        asset_management_company_name=item.company.name if item.company else None,
        investment_type=item.investment_type,
        name=item.name,
        code=item.code,
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


def _duplicate_code(session: Session, code: str, exclude_id: Optional[int] = None) -> bool:
    statement = select(SubInvestmentType).where(SubInvestmentType.code == code)
    if exclude_id is not None:
        statement = statement.where(SubInvestmentType.id != exclude_id)
    return session.exec(statement).first() is not None


def _duplicate_combination(
    session: Session,
    company_id: int,
    investment_type_normalized: str,
    name_normalized: str,
    exclude_id: Optional[int] = None,
) -> bool:
    statement = select(SubInvestmentType).where(
        SubInvestmentType.asset_management_company_id == company_id,
        SubInvestmentType.investment_type_normalized == investment_type_normalized,
        SubInvestmentType.name_normalized == name_normalized,
    )
    if exclude_id is not None:
        statement = statement.where(SubInvestmentType.id != exclude_id)
    return session.exec(statement).first() is not None


def get_sub_investment_types(
    session: Session,
    *,
    search: Optional[str] = None,
    asset_management_company_id: Optional[int] = None,
    investment_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    page: int = 1,
    page_size: int = 10,
) -> SubInvestmentTypeList:
    statement = select(SubInvestmentType)
    count_statement = select(func.count()).select_from(SubInvestmentType)
    filters = []
    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                col(SubInvestmentType.name).like(term),
                col(SubInvestmentType.code).like(term),
                col(SubInvestmentType.investment_type).like(term),
            )
        )
    if asset_management_company_id is not None:
        filters.append(SubInvestmentType.asset_management_company_id == asset_management_company_id)
    if investment_type:
        filters.append(SubInvestmentType.investment_type_normalized == _normalize_text(investment_type))
    if is_active is not None:
        filters.append(SubInvestmentType.is_active == is_active)
    for item_filter in filters:
        statement = statement.where(item_filter)
        count_statement = count_statement.where(item_filter)

    sort_column = _SORT_COLUMNS.get(sort_by, SubInvestmentType.name)
    if sort_dir == "desc":
        sort_column = sort_column.desc()
    statement = statement.order_by(sort_column)

    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)
    total = session.exec(count_statement).one()
    rows = session.exec(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return SubInvestmentTypeList(
        items=[_to_read(item, session) for item in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


def get_sub_investment_type_by_id(
    session: Session,
    sub_investment_type_id: int,
) -> SubInvestmentType | None:
    return session.get(SubInvestmentType, sub_investment_type_id)


def create_sub_investment_type(
    session: Session,
    data: SubInvestmentTypeCreate,
    actor_user_id: Optional[int],
) -> SubInvestmentTypeRead:
    _validate_company(session, data.asset_management_company_id)
    investment_type = _clean_text(data.investment_type)
    name = _clean_text(data.name)
    code = _clean_code(data.code)
    investment_type_normalized = _normalize_text(investment_type)
    name_normalized = _normalize_text(name)
    if not investment_type:
        raise ValueError("Investment type is required")
    if not name:
        raise ValueError("Name is required")
    if not code:
        raise ValueError("Code is required")
    if _duplicate_code(session, code):
        raise FileExistsError("Sub-investment type code already exists")
    if _duplicate_combination(
        session,
        data.asset_management_company_id,
        investment_type_normalized,
        name_normalized,
    ):
        raise FileExistsError("Sub-investment type already exists for this company and investment type")
    item = SubInvestmentType(
        asset_management_company_id=data.asset_management_company_id,
        investment_type=investment_type,
        investment_type_normalized=investment_type_normalized,
        name=name,
        name_normalized=name_normalized,
        code=code,
        description=data.description.strip() if data.description else None,
        is_active=data.is_active,
        created_by=actor_user_id,
        updated_by=actor_user_id,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return _to_read(item, session)


def update_sub_investment_type(
    session: Session,
    sub_investment_type_id: int,
    data: SubInvestmentTypeUpdate,
    actor_user_id: Optional[int],
) -> SubInvestmentTypeRead | None:
    item = session.get(SubInvestmentType, sub_investment_type_id)
    if not item:
        return None
    _validate_company(session, data.asset_management_company_id)
    investment_type = _clean_text(data.investment_type)
    name = _clean_text(data.name)
    code = _clean_code(data.code)
    investment_type_normalized = _normalize_text(investment_type)
    name_normalized = _normalize_text(name)
    if not investment_type:
        raise ValueError("Investment type is required")
    if not name:
        raise ValueError("Name is required")
    if not code:
        raise ValueError("Code is required")
    if _duplicate_code(session, code, sub_investment_type_id):
        raise FileExistsError("Sub-investment type code already exists")
    if _duplicate_combination(
        session,
        data.asset_management_company_id,
        investment_type_normalized,
        name_normalized,
        sub_investment_type_id,
    ):
        raise FileExistsError("Sub-investment type already exists for this company and investment type")
    item.asset_management_company_id = data.asset_management_company_id
    item.investment_type = investment_type
    item.investment_type_normalized = investment_type_normalized
    item.name = name
    item.name_normalized = name_normalized
    item.code = code
    item.description = data.description.strip() if data.description else None
    item.is_active = data.is_active
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def update_sub_investment_type_status(
    session: Session,
    sub_investment_type_id: int,
    is_active: bool,
    actor_user_id: Optional[int],
) -> SubInvestmentTypeRead | None:
    item = session.get(SubInvestmentType, sub_investment_type_id)
    if not item:
        return None
    item.is_active = is_active
    item.updated_by = actor_user_id
    item.updated_at = datetime.utcnow()
    session.add(item)
    session.commit()
    return _to_read(item, session)


def delete_sub_investment_type(session: Session, sub_investment_type_id: int) -> bool | None:
    item = session.get(SubInvestmentType, sub_investment_type_id)
    if not item:
        return False
    known_dependency_tables: list[tuple[str, str, bool]] = [
        ("customer", "sub_investment_type_id", False),
        ("customers", "sub_investment_type_id", False),
        ("investment_product", "sub_investment_type_id", False),
        ("investment_products", "sub_investment_type_id", False),
        ("transaction", "sub_investment_type_id", True),
        ("transactions", "sub_investment_type_id", True),
        ("investment_transaction", "sub_investment_type_id", True),
        ("investment_transactions", "sub_investment_type_id", True),
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
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :sub_investment_type_id AND is_active = 1 LIMIT 1"
        elif active_only and "status" in columns:
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :sub_investment_type_id AND status IN ('active', 'pending', 'open') LIMIT 1"
        else:
            query = f"SELECT 1 FROM {table_name} WHERE {column_name} = :sub_investment_type_id LIMIT 1"
        has_reference = session.exec(
            text(query).bindparams(sub_investment_type_id=sub_investment_type_id)
        ).first()
        if has_reference:
            return None
    session.delete(item)
    session.commit()
    return True
