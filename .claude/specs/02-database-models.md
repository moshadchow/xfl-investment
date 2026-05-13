# Spec: Database Models

## Overview
This step completes the database layer by adding Pydantic request/response schemas, CRUD helper functions, and SQLModel relationship definitions for all three tables (`role`, `user`, `fund_data`). The models from Step 01 are functional but bare — they lack the Pydantic schemas needed by FastAPI route handlers (request validation, response serialisation) and the CRUD helpers needed to keep business logic out of routers. No new tables are added; this step makes the existing tables fully usable. It also seeds the two default roles (`admin`, `user`) on startup so the database is never in an invalid state.

## Depends on
Step 01 — Project Setup (backend scaffold, models, database engine, and app bootstrap must be complete).

## Backend routes
No new routes. (Routes are wired in Step 03 — Auth.)

## Frontend routes
No new frontend routes.

## Database changes
No new tables. The three existing tables (`role`, `user`, `fund_data`) gain SQLModel `Relationship` back-references for convenient ORM traversal. The `FundData` model also gets explicit `Numeric(18, 4)` enforced via `sa_column` using the workaround confirmed to work with SQLModel 0.0.38 + Pydantic v2.

Updated model definitions:

```python
# backend/app/models/role.py
from typing import TYPE_CHECKING, List, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .user import User

class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
    users: List["User"] = Relationship(back_populates="role")
```

```python
# backend/app/models/user.py
from typing import TYPE_CHECKING, List, Optional
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .role import Role
    from .fund_data import FundData

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=100, unique=True, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    role_id: int = Field(foreign_key="role.id", nullable=False)
    is_active: bool = Field(default=True)
    role: Optional["Role"] = Relationship(back_populates="users")
    fund_entries: List["FundData"] = Relationship(back_populates="creator")
```

```python
# backend/app/models/fund_data.py — unchanged from Step 01 fix
# (plain Decimal annotation, no Field kwargs on numeric fields)
```

## Backend files to change

**schemas/**
- `backend/app/schemas/role.py` — `RoleRead` response schema (new)
- `backend/app/schemas/user.py` — `UserCreate`, `UserRead`, `UserWithRole` schemas (new)
- `backend/app/schemas/fund_data.py` — `FundDataCreate`, `FundDataUpdate`, `FundDataRead` schemas (new)

**crud/**
- `backend/app/crud/role.py` — `get_role_by_name`, `get_all_roles`, `create_role` (new)
- `backend/app/crud/user.py` — `get_user_by_username`, `get_user_by_id`, `get_all_users`, `create_user`, `update_user`, `delete_user` (new)
- `backend/app/crud/fund_data.py` — `create_fund_entry`, `get_fund_entries`, `get_fund_entry_by_id`, `update_fund_entry`, `delete_fund_entry` (new)

**models/**
- `backend/app/models/role.py` — add `Relationship` back-ref to users (modify)
- `backend/app/models/user.py` — add `Relationship` back-refs to role and fund_entries (modify)

**other/**
- `backend/app/database.py` — add `seed_roles()` called from lifespan after `create_db_and_tables()` (modify)
- `backend/app/main.py` — call `seed_roles()` in lifespan (modify)

## Frontend files to change
No frontend files to change in this step.

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`)
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`. The `FundData` model uses plain `Decimal` annotation (SQLModel 0.0.38 auto-maps `Decimal` → `Numeric`). Do not add `Field(sa_type=...)` or `Field(sa_column=...)` on these fields — it breaks Pydantic v2 schema generation.
- Passwords hashed with `passlib[bcrypt]` — never stored plain. `UserCreate` schema must include a plain `password: str` field; CRUD layer hashes it before writing `hashed_password`. `hashed_password` must never appear in any response schema.
- Admin-only routes must use `require_admin` dep from `deps.py` (not applicable this step — no routes yet).
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true` (not applicable this step).
- All React components use Tailwind utility classes only — no inline styles (not applicable this step).
- Charts (Recharts) must not render when data array is empty (not applicable this step).
- CRUD functions must accept a `Session` argument — never create their own session internally.
- `seed_roles()` must be idempotent: use `get_or_create` logic (`SELECT` first, `INSERT` only if absent). Never truncate or re-insert.
- `get_fund_entries` must always filter by `from_date` and `to_date` — never return unbounded results.
- All `FundDataCreate` / `FundDataRead` money fields typed as `Decimal` in schemas.
- `UserRead` and `UserWithRole` must never include `hashed_password`.
- Relationships use `TYPE_CHECKING` guard for imports to avoid circular import errors.

## Definition of done

- [ ] `from app.schemas.user import UserCreate, UserRead, UserWithRole` imports cleanly with no errors.
- [ ] `from app.schemas.fund_data import FundDataCreate, FundDataUpdate, FundDataRead` imports cleanly.
- [ ] `from app.crud.user import create_user, get_user_by_username` imports cleanly.
- [ ] `from app.crud.fund_data import create_fund_entry, get_fund_entries` imports cleanly.
- [ ] `uvicorn app.main:app --reload --port 8000` starts without errors and logs "Application startup complete".
- [ ] After startup, MySQL `SELECT * FROM role;` returns exactly two rows: `admin` and `user` (seed ran).
- [ ] Re-starting uvicorn does not insert duplicate roles (seed is idempotent).
- [ ] `UserCreate(username="test", password="plain", role_id=1)` — the CRUD `create_user` stores a bcrypt hash in `hashed_password`, not the plain string.
- [ ] `UserRead` schema does not have a `hashed_password` field (verified by `UserRead.model_fields`).
- [ ] `get_fund_entries(session, from_date=date(2024,1,1), to_date=date(2024,12,31))` returns only entries within that range.
- [ ] `GET http://localhost:8000/docs` — Swagger UI loads (200 OK), confirming the app still boots correctly after all changes.
