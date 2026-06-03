from passlib.context import CryptContext
from sqlmodel import Session, select

from ..models.user import User
from ..schemas.user import UserCreate

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(plain: str) -> str:
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return _pwd_context.verify(plain, hashed)


def get_user_by_username(session: Session, username: str) -> User | None:
    return session.exec(select(User).where(User.username == username)).first()


def get_user_by_id(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)


def get_all_users(session: Session) -> list[User]:
    return list(session.exec(select(User)).all())


def create_user(session: Session, data: UserCreate) -> User:
    user = User(
        username=data.username,
        hashed_password=_hash_password(data.password),
        role_id=data.role_id,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def update_user(session: Session, user: User, data: dict) -> User:
    if "password" in data:
        data = {**data, "hashed_password": _hash_password(data.pop("password"))}
    for key, value in data.items():
        setattr(user, key, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def delete_user(session: Session, user_id: int) -> bool:
    user = session.get(User, user_id)
    if not user:
        return False
    session.delete(user)
    session.commit()
    return True
