from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .company import AssetManagementCompany
    from .investment_type import InvestmentType


class Investment(SQLModel, table=True):
    __tablename__ = "investment"
    __table_args__ = (UniqueConstraint("investment_code"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    investment_code: str = Field(max_length=100, nullable=False)
    asset_management_company_id: int = Field(foreign_key="asset_management_company.id", nullable=False)
    investment_type_id: int = Field(foreign_key="investment_types.id", nullable=False)
    purchase_date: date
    purchase_units: Decimal = Field(max_digits=18, decimal_places=6, nullable=False)
    investment_amount: Decimal = Field(max_digits=18, decimal_places=2, nullable=False)
    reference_number: Optional[str] = Field(default=None, max_length=100)
    remarks: Optional[str] = Field(default=None, max_length=1000)
    status: str = Field(max_length=50, nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    company: Optional["AssetManagementCompany"] = Relationship()
    investment_type: Optional["InvestmentType"] = Relationship()
