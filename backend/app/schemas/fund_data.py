from datetime import date
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel


class FundDataCreate(SQLModel):
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal


class FundDataUpdate(SQLModel):
    date: Optional[date] = None
    investment: Optional[Decimal] = None
    market_value: Optional[Decimal] = None
    nav: Optional[Decimal] = None


class FundDataRead(SQLModel):
    id: int
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal
    created_by: Optional[int] = None
