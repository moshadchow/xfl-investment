from sqlmodel import SQLModel, Session, create_engine, select

from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def seed_roles(session: Session) -> None:
    from .models.role import Role
    for name in ("admin", "user"):
        existing = session.exec(select(Role).where(Role.name == name)).first()
        if not existing:
            session.add(Role(name=name))
    session.commit()


def get_session():
    with Session(engine) as session:
        yield session
