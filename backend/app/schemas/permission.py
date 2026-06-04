from typing import Optional

from sqlmodel import SQLModel


class PermissionRead(SQLModel):
    id: int
    code: str
    menu_key: str
    action: str
    label: str
    description: Optional[str] = None
    is_active: bool


class PermissionGroupRead(SQLModel):
    menu_key: str
    label: str
    permissions: list[PermissionRead]


class RolePermissionUpdate(SQLModel):
    permission_ids: list[int]


class RolePermissionRead(SQLModel):
    role_id: int
    role_name: str
    permissions: list[PermissionRead]
