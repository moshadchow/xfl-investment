from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class FundDataCreate(BaseModel):
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal
    company_id: Optional[int] = None


class FundDataUpdate(BaseModel):
    date: date
    investment: Optional[Decimal] = None
    market_value: Optional[Decimal] = None
    nav: Optional[Decimal] = None
    company_id: Optional[int] = None


class FundDataRead(BaseModel):
    id: int
    date: date
    investment: Decimal
    market_value: Decimal
    nav: Decimal
    created_by: Optional[int] = None
    company_id: Optional[int] = None
    company_name: Optional[str] = None
