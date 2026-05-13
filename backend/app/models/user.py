from typing import TYPE_CHECKING, List, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .fund_data import FundData
    from .role import Role


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=100, unique=True, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    role_id: int = Field(foreign_key="role.id", nullable=False)
    is_active: bool = Field(default=True)
    role: Optional["Role"] = Relationship(back_populates="users")
    fund_entries: List["FundData"] = Relationship(back_populates="creator")
