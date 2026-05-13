from typing import Optional

from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=100, unique=True, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    role_id: int = Field(foreign_key="role.id", nullable=False)
    is_active: bool = Field(default=True)
