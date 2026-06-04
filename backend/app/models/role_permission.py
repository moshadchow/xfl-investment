from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel, UniqueConstraint


class RolePermission(SQLModel, table=True):
    __tablename__ = "role_permission"
    __table_args__ = (UniqueConstraint("role_id", "permission_id"),)

    id: Optional[int] = Field(default=None, primary_key=True)
    role_id: int = Field(foreign_key="role.id", nullable=False, index=True)
    permission_id: int = Field(foreign_key="permission.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
