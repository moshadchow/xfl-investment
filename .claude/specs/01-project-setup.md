# Spec: Project Setup

## Overview
This step scaffolds the complete directory structure for the XFL Investment Reporting Software from scratch. It establishes the FastAPI backend with SQLModel, MySQL connectivity, session-based auth middleware, and CORS configuration, alongside a Vite + React + Tailwind frontend with Recharts. No business logic is implemented here — the goal is a runnable skeleton: `uvicorn` starts cleanly, `npm run dev` serves the app, and all folders/files required by later phases are in place.

## Depends on
Nothing — this is Step 01, the foundation.

## Backend routes
No new routes. (The FastAPI app will start and return 404 on all paths until routers are registered in later steps.)

## Frontend routes
No new frontend routes. (React Router is installed and `App.jsx` renders a placeholder; routes are wired in later steps.)

## Database changes
Three tables are defined as SQLModel classes and created via `SQLModel.metadata.create_all()` on startup:

```python
# backend/app/models/role.py
from typing import Optional
from sqlmodel import SQLModel, Field

class Role(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=50, unique=True, nullable=False)
```

```python
# backend/app/models/user.py
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(max_length=100, unique=True, nullable=False)
    hashed_password: str = Field(max_length=255, nullable=False)
    role_id: int = Field(foreign_key="role.id", nullable=False)
    is_active: bool = Field(default=True)
```

```python
# backend/app/models/fund_data.py
from typing import Optional
from datetime import date
from decimal import Decimal
from sqlmodel import SQLModel, Field

class FundData(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    date: date = Field(nullable=False)
    investment: Decimal = Field(max_digits=18, decimal_places=4, nullable=False)
    market_value: Decimal = Field(max_digits=18, decimal_places=4, nullable=False)
    nav: Decimal = Field(max_digits=18, decimal_places=4, nullable=False)
    created_by: Optional[int] = Field(default=None, foreign_key="user.id")
```

## Backend files to change

**models/**
- `backend/app/models/__init__.py` — empty init, imports all models so SQLModel sees them
- `backend/app/models/role.py` — `Role` SQLModel table (new)
- `backend/app/models/user.py` — `User` SQLModel table (new)
- `backend/app/models/fund_data.py` — `FundData` SQLModel table (new)

**other/**
- `backend/app/database.py` — engine creation from `DATABASE_URL`, `get_session` dependency, `create_db_and_tables()` called on startup (new)
- `backend/app/config.py` — `Settings` pydantic-settings class reading `.env` (new)
- `backend/app/deps.py` — placeholder `get_current_user` and `require_admin` stubs; fully implemented in Step 02 (new)
- `backend/app/main.py` — FastAPI app bootstrap: `SessionMiddleware`, CORS, lifespan with `create_db_and_tables()`, router stubs (new)
- `backend/requirements.txt` — all dependencies pinned (new)
- `backend/.env` — `DATABASE_URL`, `SECRET_KEY` template (new, not committed)
- `backend/.env.example` — safe template committed to repo (new)

## Frontend files to change

**root/**
- `frontend/package.json` — Vite + React + Tailwind + Recharts + Axios + React Router v6 (new)
- `frontend/vite.config.js` — proxy `/api` to `localhost:8000` in dev (new)
- `frontend/tailwind.config.js` — content paths, no custom theme yet (new)
- `frontend/index.html` — Vite entry point (new)
- `frontend/postcss.config.js` — Tailwind + autoprefixer (new)

**src/**
- `frontend/src/main.jsx` — mounts `<App />` (new)
- `frontend/src/App.jsx` — React Router `<BrowserRouter>` wrapping a placeholder route (new)
- `frontend/src/index.css` — Tailwind directives (`@tailwind base/components/utilities`) (new)

**api/**
- `frontend/src/api/client.js` — Axios instance pointed at `/api/v1` with `withCredentials: true` (new)

**context/**
- `frontend/src/context/AuthContext.jsx` — `AuthContext` with `user`, `setUser`, `loading` state; `GET /api/v1/auth/me` called on mount (stub, no real session yet) (new)

**hooks/**
- `frontend/src/hooks/useAuth.js` — `useContext(AuthContext)` shorthand (new)

**pages/**
- `frontend/src/pages/Login.jsx` — empty placeholder page (new)
- `frontend/src/pages/AdminDashboard.jsx` — empty placeholder page (new)
- `frontend/src/pages/UserDashboard.jsx` — empty placeholder page (new)

**components/layout/**
- `frontend/src/components/layout/Sidebar.jsx` — empty placeholder (new)
- `frontend/src/components/layout/Navbar.jsx` — empty placeholder (new)

**components/admin/**
- `frontend/src/components/admin/RoleManager.jsx` — empty placeholder (new)
- `frontend/src/components/admin/UserManager.jsx` — empty placeholder (new)
- `frontend/src/components/admin/FundDataForm.jsx` — empty placeholder (new)

**components/user/**
- `frontend/src/components/user/ReportTable.jsx` — empty placeholder (new)
- `frontend/src/components/user/ReportChart.jsx` — empty placeholder (new)

## New dependencies

**Backend** (pip):
```
fastapi
uvicorn[standard]
sqlmodel
pymysql
cryptography
passlib[bcrypt]
python-multipart
pydantic-settings
itsdangerous
starlette
```

**Frontend** (npm):
```
react
react-dom
react-router-dom
axios
recharts
tailwindcss
autoprefixer
postcss
@vitejs/plugin-react
vite
```

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`). `SessionMiddleware` uses `SECRET_KEY` from `.env`.
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`. Use SQLModel `Field(max_digits=18, decimal_places=4)`.
- Passwords hashed with `passlib[bcrypt]` — never stored plain. (No passwords created in this step, but `passlib` must be in `requirements.txt`.)
- Admin-only routes must use `require_admin` dep from `deps.py` (stub is enough at this step; must match the final signature).
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- Charts (Recharts) must not render when data array is empty. (No charts in this step; rule applies from Step 04 onward.)
- `DATABASE_URL` and `SECRET_KEY` must never be hardcoded — read from `.env` via `pydantic-settings`.
- The `.env` file must be listed in `.gitignore`; `.env.example` (without real secrets) is committed instead.
- `create_db_and_tables()` is called once via FastAPI `lifespan`, not on every request.
- CORS must allow `http://localhost:5173` in dev. Origin list comes from `.env` so it can be tightened in production.
- Vite dev server must proxy `/api` → `http://localhost:8000` so the frontend never hard-codes the backend port.

## Definition of done

- [ ] `cd backend && uvicorn app.main:app --reload --port 8000` starts without errors and logs "Application startup complete".
- [ ] MySQL database contains the three tables (`role`, `user`, `fund_data`) after first startup.
- [ ] `GET http://localhost:8000/docs` returns the FastAPI Swagger UI (200 OK).
- [ ] `cd frontend && npm install && npm run dev` starts Vite on port 5173 without errors.
- [ ] Browser loads `http://localhost:5173` and renders without a blank white screen or console errors.
- [ ] `http://localhost:5173/api/v1/auth/me` proxied through Vite returns a response from the backend (even if 401/404 — confirms proxy works).
- [ ] `.env` is absent from `git status` (gitignored); `.env.example` is tracked.
- [ ] `requirements.txt` lists all required packages; `pip install -r requirements.txt` succeeds in a clean venv.
- [ ] `npm run build` completes without TypeScript/lint errors (Vite build check).
- [ ] No plaintext secrets appear in any committed file.
