from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine, select

from .config import settings

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)


def _normalized(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


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


def _index_exists(inspector, table_name: str, index_name: str) -> bool:
    indexes = inspector.get_indexes(table_name)
    constraints = inspector.get_unique_constraints(table_name)
    return any(item.get("name") == index_name for item in [*indexes, *constraints])


def _ensure_sub_investment_type_columns() -> None:
    inspector = inspect(engine)
    if "investment_sub_types" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("investment_sub_types")}
    statements = []
    varchar_type = "VARCHAR(100)"
    if "investment_type" not in columns:
        statements.append(f"ALTER TABLE investment_sub_types ADD COLUMN investment_type {varchar_type} NOT NULL DEFAULT ''")
    if "investment_type_normalized" not in columns:
        statements.append(f"ALTER TABLE investment_sub_types ADD COLUMN investment_type_normalized {varchar_type} NOT NULL DEFAULT ''")
    if "name_normalized" not in columns:
        statements.append(f"ALTER TABLE investment_sub_types ADD COLUMN name_normalized {varchar_type} NOT NULL DEFAULT ''")
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
        if "investment_type_id" in columns and "investment_type" in inspector.get_table_names():
            rows = connection.execute(
                text(
                    "SELECT ist.id, COALESCE(it.name, '') AS investment_type_name, ist.name "
                    "FROM investment_sub_types ist "
                    "LEFT JOIN investment_type it ON it.id = ist.investment_type_id"
                )
            ).mappings()
            for row in rows:
                investment_type = row["investment_type_name"].strip()
                name = row["name"].strip()
                connection.execute(
                    text(
                        "UPDATE investment_sub_types "
                        "SET investment_type = :investment_type, "
                        "investment_type_normalized = :investment_type_normalized, "
                        "name_normalized = :name_normalized "
                        "WHERE id = :id"
                    ),
                    {
                        "investment_type": investment_type,
                        "investment_type_normalized": _normalized(investment_type),
                        "name_normalized": _normalized(name),
                        "id": row["id"],
                    },
                )
        rows = connection.execute(
            text("SELECT id, investment_type, name FROM investment_sub_types")
        ).mappings()
        for row in rows:
            connection.execute(
                text(
                    "UPDATE investment_sub_types "
                    "SET investment_type_normalized = :investment_type_normalized, "
                    "name_normalized = :name_normalized "
                    "WHERE id = :id"
                ),
                {
                    "investment_type_normalized": _normalized(row["investment_type"]),
                    "name_normalized": _normalized(row["name"]),
                    "id": row["id"],
                },
            )
        if "investment_type_id" in columns:
            dialect = engine.dialect.name
            if dialect == "mysql":
                try:
                    connection.execute(text("ALTER TABLE investment_sub_types DROP COLUMN investment_type_id"))
                except Exception:
                    connection.execute(text("ALTER TABLE investment_sub_types MODIFY investment_type_id INT NULL"))
            else:
                connection.execute(text("ALTER TABLE investment_sub_types DROP COLUMN investment_type_id"))

    inspector = inspect(engine)
    with engine.begin() as connection:
        if not _index_exists(inspector, "investment_sub_types", "ix_investment_sub_types_code_unique"):
            connection.execute(
                text("CREATE UNIQUE INDEX ix_investment_sub_types_code_unique ON investment_sub_types (code)")
            )
        if not _index_exists(inspector, "investment_sub_types", "ix_investment_sub_types_unique_combo"):
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX ix_investment_sub_types_unique_combo "
                    "ON investment_sub_types (asset_management_company_id, investment_type_normalized, name_normalized)"
                )
            )


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _ensure_company_columns()
    _ensure_sub_investment_type_columns()


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
