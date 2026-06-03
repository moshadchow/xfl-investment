from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    is_active: bool = True


class CompanyRead(BaseModel):
    id: int
    name: str
    is_active: bool
