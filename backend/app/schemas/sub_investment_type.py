from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class SubInvestmentTypeCreate(SQLModel):
    asset_management_company_id: int
    investment_type: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = True


class SubInvestmentTypeUpdate(SQLModel):
    asset_management_company_id: int
    investment_type: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=100)
    code: str = Field(min_length=1, max_length=50)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool


class SubInvestmentTypeStatusUpdate(SQLModel):
    is_active: bool


class SubInvestmentTypeRead(SQLModel):
    id: int
    asset_management_company_id: int
    asset_management_company_name: Optional[str] = None
    investment_type: str
    name: str
    code: str
    description: Optional[str] = None
    is_active: bool
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class SubInvestmentTypeList(SQLModel):
    items: list[SubInvestmentTypeRead]
    total: int
    page: int
    page_size: int
