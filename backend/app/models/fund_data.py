from datetime import date
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class FundData(SQLModel, table=True):
    __tablename__ = "fund_data"

    id: Optional[int] = Field(default=None, primary_key=True)
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
