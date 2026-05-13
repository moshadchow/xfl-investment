"""
Run from backend/ with the venv activated:
    python seed.py
"""
from sqlmodel import Session, select

from app.database import create_db_and_tables, engine
from app import models  # noqa: F401 — registers all models with SQLModel.metadata
from app.models.role import Role
from app.models.user import User
from app.crud.user import create_user
from app.schemas.user import UserCreate


ROLES = ("admin", "user")

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "changeme"  # change after first login


def seed_roles(session: Session) -> dict[str, Role]:
    role_map = {}
    for name in ROLES:
        role = session.exec(select(Role).where(Role.name == name)).first()
        if not role:
            role = Role(name=name)
            session.add(role)
            session.flush()
            print(f"  [+] role '{name}' created (id={role.id})")
        else:
            print(f"  [=] role '{name}' already exists (id={role.id})")
        role_map[name] = role
    session.commit()
    return role_map


def seed_admin(session: Session, admin_role: Role) -> None:
    existing = session.exec(select(User).where(User.username == ADMIN_USERNAME)).first()
    if existing:
        print(f"  [=] user '{ADMIN_USERNAME}' already exists (id={existing.id})")
        return
    user = create_user(session, UserCreate(
        username=ADMIN_USERNAME,
        password=ADMIN_PASSWORD,
        role_id=admin_role.id,
    ))
    print(f"  [+] admin user '{ADMIN_USERNAME}' created (id={user.id})")
    print(f"      password: {ADMIN_PASSWORD}  (change this after first login)")


def main() -> None:
    print("Creating tables...")
    create_db_and_tables()

    with Session(engine) as session:
        print("Seeding roles...")
        role_map = seed_roles(session)

        print("Seeding admin user...")
        seed_admin(session, role_map["admin"])

    print("Done.")


if __name__ == "__main__":
    main()
