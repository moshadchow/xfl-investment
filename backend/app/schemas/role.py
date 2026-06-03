from typing import Optional

from sqlmodel import Field, SQLModel


class RoleRead(SQLModel):
    id: int
    name: str


class RoleCreate(SQLModel):
    name: str = Field(min_length=1, max_length=50)


class RoleUpdate(SQLModel):
    name: str = Field(min_length=1, max_length=50)


class RoleDeleteError(SQLModel):
    detail: str
    assigned_user_count: Optional[int] = None
