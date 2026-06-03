from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .company import AssetManagementCompany


class SubInvestmentType(SQLModel, table=True):
    __tablename__ = "investment_sub_types"
    __table_args__ = (
        UniqueConstraint("code"),
        UniqueConstraint("asset_management_company_id", "investment_type_normalized", "name_normalized"),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    asset_management_company_id: int = Field(foreign_key="asset_management_company.id", nullable=False)
    investment_type: str = Field(max_length=100, nullable=False)
    investment_type_normalized: str = Field(max_length=100, nullable=False)
    name: str = Field(max_length=100, nullable=False)
    name_normalized: str = Field(max_length=100, nullable=False)
    code: str = Field(max_length=50, nullable=False)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True, nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    company: Optional["AssetManagementCompany"] = Relationship()
