from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .fund_data import FundData


class AssetManagementCompany(SQLModel, table=True):
    __tablename__ = "asset_management_company"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, unique=True, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    fund_entries: List["FundData"] = Relationship(back_populates="company")
