from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .company import AssetManagementCompany
    from .user import User


class FundData(SQLModel, table=True):
    __tablename__ = "fund_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    investment: Decimal = Field(max_digits=18, decimal_places=4)
    market_value: Decimal = Field(max_digits=18, decimal_places=4)
    nav: Decimal = Field(max_digits=18, decimal_places=4)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    company_id: Optional[int] = Field(default=None, foreign_key="asset_management_company.id")
    creator: Optional["User"] = Relationship(back_populates="fund_entries")
    company: Optional["AssetManagementCompany"] = Relationship(back_populates="fund_entries")
