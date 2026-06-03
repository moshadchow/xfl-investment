from sqlmodel import Session, select

from ..models.company import AssetManagementCompany
from ..models.fund_data import FundData
from ..schemas.company import CompanyCreate, CompanyRead

_COLUMNS = ["id", "name", "is_active"]


def _to_read(company: AssetManagementCompany, session: Session) -> CompanyRead:
    session.refresh(company, attribute_names=_COLUMNS)
    return CompanyRead.model_validate({c: getattr(company, c) for c in _COLUMNS})


def get_all_companies(session: Session) -> list[CompanyRead]:
    results = session.exec(select(AssetManagementCompany)).all()
    return [_to_read(c, session) for c in results]


def get_company_by_id(session: Session, company_id: int) -> AssetManagementCompany | None:
    return session.get(AssetManagementCompany, company_id)


def create_company(session: Session, data: CompanyCreate) -> CompanyRead:
    company = AssetManagementCompany(name=data.name, is_active=data.is_active)
    session.add(company)
    session.commit()
    return _to_read(company, session)


def update_company(
    session: Session, company_id: int, data: CompanyCreate
) -> CompanyRead | None:
    company = session.get(AssetManagementCompany, company_id)
    if not company:
        return None
    company.name = data.name
    company.is_active = data.is_active
    session.add(company)
    session.commit()
    return _to_read(company, session)


def delete_company(session: Session, company_id: int) -> bool:
    company = session.get(AssetManagementCompany, company_id)
    if not company:
        return False
    # Block deletion if company has fund entries
    has_entries = session.exec(
        select(FundData).where(FundData.company_id == company_id)
    ).first()
    if has_entries:
        return None  # signals conflict
    session.delete(company)
    session.commit()
    return True
