from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .investment import Investment


class InvestmentDetail(SQLModel, table=True):
    __tablename__ = "investment_detail"
    __table_args__ = (UniqueConstraint("investment_id", "investment_date"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    investment_id: int = Field(foreign_key="investment.id", nullable=False)
    investment_date: date = Field(nullable=False)
    investment_amount: Decimal = Field(max_digits=18, decimal_places=2, nullable=False)
    market_value: Decimal = Field(max_digits=18, decimal_places=2, nullable=False)
    nav: Decimal = Field(max_digits=18, decimal_places=4, nullable=False)
    gain_loss: Decimal = Field(max_digits=18, decimal_places=2, nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    investment: Optional["Investment"] = Relationship()
