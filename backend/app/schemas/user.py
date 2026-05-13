from typing import Optional

from sqlmodel import SQLModel

from .role import RoleRead


class UserCreate(SQLModel):
    username: str
    password: str
    role_id: int


class UserRead(SQLModel):
    id: int
    username: str
    role_id: int
    is_active: bool


class UserWithRole(SQLModel):
    id: int
    username: str
    is_active: bool
    role: Optional[RoleRead] = None


class UserUpdate(SQLModel):
    is_active: Optional[bool] = None
    role_id: Optional[int] = None
