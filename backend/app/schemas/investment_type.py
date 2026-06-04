from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class InvestmentTypeCreate(SQLModel):
    asset_management_company_id: int
    investment_type_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True


class InvestmentTypeUpdate(SQLModel):
    investment_type_name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool


class InvestmentTypeStatusUpdate(SQLModel):
    is_active: bool


class InvestmentTypeRead(SQLModel):
    id: int
    asset_management_company_id: int
    asset_management_company_name: Optional[str] = None
    investment_type_name: str
    description: Optional[str] = None
    is_active: bool
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class InvestmentTypeList(SQLModel):
    items: list[InvestmentTypeRead]
    total: int
    page: int
    page_size: int
