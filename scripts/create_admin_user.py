import os
from sqlmodel import Session, select
from backend.app.database import engine, get_session
from backend.app.models.role import Role
from backend.app.models.user import User
from backend.app.crud.user import create_user
from backend.app.schemas.user import UserCreate

# Ensure DB tables exist
from backend.app.database import create_db_and_tables
create_db_and_tables()

with Session(engine) as session:
    # Get or create admin role
    admin_role = session.exec(select(Role).where(Role.name == "admin")).first()
    if not admin_role:
        admin_role = Role(name="admin")
        session.add(admin_role)
        session.commit()
        session.refresh(admin_role)
    # Check if admin user exists
    existing = session.exec(select(User).where(User.username == "admin")).first()
    if not existing:
        user_data = UserCreate(username="admin", password="admin123", role_id=admin_role.id)
        create_user(session, user_data)
        print("Admin user created")
    else:
        print("Admin user already exists")
