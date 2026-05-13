from sqlmodel import SQLModel


class RoleRead(SQLModel):
    id: int
    name: str
