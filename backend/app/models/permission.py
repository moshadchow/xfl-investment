from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Permission(SQLModel, table=True):
    __tablename__ = "permission"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(max_length=100, unique=True, nullable=False, index=True)
    menu_key: str = Field(max_length=50, nullable=False, index=True)
    action: str = Field(max_length=30, nullable=False)
    label: str = Field(max_length=100, nullable=False)
    description: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
