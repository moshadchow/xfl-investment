from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Text
from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    entity_type: str = Field(max_length=50, nullable=False)
    entity_id: Optional[int] = Field(default=None)
    action: str = Field(max_length=50, nullable=False)
    details: str = Field(sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
