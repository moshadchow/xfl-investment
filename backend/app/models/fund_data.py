from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User


class FundData(SQLModel, table=True):
    __tablename__ = "fund_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    creator: Optional["User"] = Relationship(back_populates="fund_entries")
