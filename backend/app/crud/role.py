from sqlmodel import Session, select

from ..models.role import Role


def get_role_by_name(session: Session, name: str) -> Role | None:
    return session.exec(select(Role).where(Role.name == name)).first()


def get_all_roles(session: Session) -> list[Role]:
    return list(session.exec(select(Role)).all())


def create_role(session: Session, name: str) -> Role:
    role = Role(name=name)
    session.add(role)
    session.commit()
    session.refresh(role)
    return role
