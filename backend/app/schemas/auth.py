from sqlmodel import SQLModel


class LoginRequest(SQLModel):
    username: str
    password: str
