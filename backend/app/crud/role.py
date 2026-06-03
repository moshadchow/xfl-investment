from sqlmodel import Session, select

from ..models.role import Role
from ..models.user import User


PROTECTED_ROLE_NAMES = {"admin", "user"}


def get_role_by_name(session: Session, name: str) -> Role | None:
    return session.exec(select(Role).where(Role.name == name)).first()


def get_role_by_id(session: Session, role_id: int) -> Role | None:
    return session.get(Role, role_id)


def get_all_roles(session: Session) -> list[Role]:
    return list(session.exec(select(Role)).all())


def create_role(session: Session, name: str) -> Role:
    role = Role(name=name)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def update_role(session: Session, role: Role, *, name: str) -> Role:
    role.name = name
    session.add(role)
    session.commit()
    session.refresh(role)
    return role


def count_users_for_role(session: Session, role_id: int) -> int:
    return len(session.exec(select(User).where(User.role_id == role_id)).all())


def delete_role(session: Session, role: Role) -> None:
    session.delete(role)
    session.commit()
