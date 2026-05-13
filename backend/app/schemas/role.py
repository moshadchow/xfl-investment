from sqlmodel import Field, SQLModel


class RoleRead(SQLModel):
    id: int
    name: str


class RoleCreate(SQLModel):
    name: str = Field(min_length=1, max_length=50)
