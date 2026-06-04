from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


class InvestmentCreate(SQLModel):
    asset_management_company_id: int
    investment_type_id: int
    purchase_date: date
    purchase_units: Decimal = Field(gt=0, max_digits=18, decimal_places=6)
    investment_amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    reference_number: Optional[str] = Field(default=None, max_length=100)
    remarks: Optional[str] = Field(default=None, max_length=1000)
    status: str = Field(min_length=1, max_length=50)


class InvestmentUpdate(SQLModel):
    purchase_date: date
    purchase_units: Decimal = Field(gt=0, max_digits=18, decimal_places=6)
    investment_amount: Decimal = Field(gt=0, max_digits=18, decimal_places=2)
    reference_number: Optional[str] = Field(default=None, max_length=100)
    remarks: Optional[str] = Field(default=None, max_length=1000)
    status: str = Field(min_length=1, max_length=50)


class InvestmentRead(SQLModel):
    id: int
    investment_code: str
    asset_management_company_id: int
    asset_management_company_name: Optional[str] = None
    investment_type_id: int
    investment_type_name: str
    purchase_date: date
    purchase_units: Decimal
    investment_amount: Decimal
    reference_number: Optional[str] = None
    remarks: Optional[str] = None
    status: str
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class InvestmentList(SQLModel):
    items: list[InvestmentRead]
    total: int
    page: int
    page_size: int


class InvestmentTypeOptionRead(SQLModel):
    id: int
    investment_type_name: str
