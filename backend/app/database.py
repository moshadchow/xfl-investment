from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine, select

from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


def _ensure_company_columns() -> None:
    inspector = inspect(engine)
    if "asset_management_company" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("asset_management_company")}
    if "is_active" in columns:
        return
    with engine.begin() as connection:
        dialect = engine.dialect.name
        if dialect == "mysql":
            connection.execute(text("ALTER TABLE asset_management_company ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE"))
        else:
            connection.execute(text("ALTER TABLE asset_management_company ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))


def _add_column(connection, table_name: str, column_name: str, definition: str) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name not in columns:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def _ensure_investment_type_columns() -> None:
    inspector = inspect(engine)
    if "investment_types" not in inspector.get_table_names():
        return
    dialect = engine.dialect.name
    int_type = "INT" if dialect == "mysql" else "INTEGER"
    bool_type = "BOOLEAN" if dialect == "mysql" else "BOOLEAN"
    datetime_type = "DATETIME" if dialect == "mysql" else "TIMESTAMP"
    with engine.begin() as connection:
        _add_column(connection, "investment_types", "asset_management_company_id", f"{int_type} NULL")
        _add_column(connection, "investment_types", "investment_type_name", "VARCHAR(100) NOT NULL DEFAULT ''")
        _add_column(connection, "investment_types", "description", "VARCHAR(500) NULL")
        _add_column(connection, "investment_types", "is_active", f"{bool_type} NOT NULL DEFAULT TRUE")
        _add_column(connection, "investment_types", "created_by", f"{int_type} NULL")
        _add_column(connection, "investment_types", "updated_by", f"{int_type} NULL")
        _add_column(connection, "investment_types", "created_at", f"{datetime_type} NOT NULL DEFAULT CURRENT_TIMESTAMP")
        _add_column(connection, "investment_types", "updated_at", f"{datetime_type} NOT NULL DEFAULT CURRENT_TIMESTAMP")


def _ensure_investment_columns() -> None:
    inspector = inspect(engine)
    if "investment" not in inspector.get_table_names():
        return
    dialect = engine.dialect.name
    int_type = "INT" if dialect == "mysql" else "INTEGER"
    varchar_type = "VARCHAR(50)"
    datetime_type = "DATETIME" if dialect == "mysql" else "TIMESTAMP"
    with engine.begin() as connection:
        _add_column(connection, "investment", "investment_code", "VARCHAR(20) NOT NULL DEFAULT ''")
        _add_column(connection, "investment", "investment_type_id", f"{int_type} NULL")
        _add_column(connection, "investment", "reference_number", "VARCHAR(100) NULL")
        _add_column(connection, "investment", "remarks", "VARCHAR(1000) NULL")
        _add_column(connection, "investment", "status", f"{varchar_type} NOT NULL DEFAULT 'active'")
        _add_column(connection, "investment", "created_by", f"{int_type} NULL")
        _add_column(connection, "investment", "updated_by", f"{int_type} NULL")
        _add_column(connection, "investment", "created_at", f"{datetime_type} NOT NULL DEFAULT CURRENT_TIMESTAMP")
        _add_column(connection, "investment", "updated_at", f"{datetime_type} NOT NULL DEFAULT CURRENT_TIMESTAMP")


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_company_columns()
    _ensure_investment_type_columns()
    _ensure_investment_columns()


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
