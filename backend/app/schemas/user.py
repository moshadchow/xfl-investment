from typing import Optional

from sqlmodel import Field, SQLModel

from .role import RoleRead


class UserCreate(SQLModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1)
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
    username: Optional[str] = Field(default=None, min_length=1, max_length=100)
    password: Optional[str] = Field(default=None, min_length=1)
    is_active: Optional[bool] = None
    role_id: Optional[int] = None


class UserPut(SQLModel):
    username: str = Field(min_length=1, max_length=100)
    password: Optional[str] = Field(default=None, min_length=1)
    is_active: bool
    role_id: int
