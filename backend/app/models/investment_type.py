from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .company import AssetManagementCompany


class InvestmentType(SQLModel, table=True):
    __tablename__ = "investment_types"
    __table_args__ = (UniqueConstraint("asset_management_company_id", "investment_type_name"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_management_company_id: int = Field(foreign_key="asset_management_company.id", nullable=False)
    investment_type_name: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True, nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    company: Optional["AssetManagementCompany"] = Relationship()
