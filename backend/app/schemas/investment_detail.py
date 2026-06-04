from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class InvestmentDetailCreate(SQLModel):
    investment_id: int
    investment_date: date
    market_value: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    nav: Decimal = Field(gt=0, max_digits=18, decimal_places=4)


class InvestmentDetailUpdate(SQLModel):
    investment_date: date
    market_value: Decimal = Field(ge=0, max_digits=18, decimal_places=2)
    nav: Decimal = Field(gt=0, max_digits=18, decimal_places=4)


class InvestmentDetailRead(SQLModel):
    id: int
    investment_id: int
    investment_code: str
    asset_management_company_id: int
    asset_management_company_name: Optional[str] = None
    investment_type_id: int
    investment_type_name: str
    investment_date: date
    investment_amount: Decimal
    market_value: Decimal
    nav: Decimal
    gain_loss: Decimal
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class InvestmentDetailList(SQLModel):
    items: list[InvestmentDetailRead]
    total: int
    page: int
    page_size: int


class InvestmentDetailInvestmentOptionRead(SQLModel):
    id: int
    investment_code: str
    investment_amount: Decimal
    purchase_date: date
    purchase_units: Decimal
    status: str
