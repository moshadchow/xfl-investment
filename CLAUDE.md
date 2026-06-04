# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XFL Investment is a mini investment reporting tool. Admin users manage reference data and investment/fund entries; regular users view reports and charts.

## Tech Stack

- Backend: FastAPI, SQLModel, SQLAlchemy, MySQL, session-cookie auth via Starlette `SessionMiddleware`
- Frontend: React 18, Vite, React Router v6, Axios, Recharts, Tailwind CSS
- Auth: server-side session cookie only; no JWT

## Development Commands

### Backend

```bash
cd backend
./venv/Scripts/python.exe -m pip install -r requirements.txt
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

Required backend environment variables are loaded from `backend/.env` by `pydantic-settings`:

```env
DATABASE_URL=mysql+pymysql://user:password@host:3306/db_name
SECRET_KEY=replace-me
ALLOWED_ORIGINS=http://localhost:5173
```

There is no backend test runner configured in `requirements.txt` at this time.

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

`frontend/package.json` currently defines only `dev`, `build`, and `preview`; there are no configured lint or test scripts.

## High-Level Architecture

### Backend layout

- `backend/app/main.py` creates the FastAPI app, configures session and CORS middleware, runs startup DB setup, and mounts all routers under `/api/v1`.
- `backend/app/config.py` defines `DATABASE_URL`, `SECRET_KEY`, and `ALLOWED_ORIGINS` settings from `.env`.
- `backend/app/database.py` owns the SQLModel engine/session dependency, calls `SQLModel.metadata.create_all()`, seeds default roles, and contains small schema-update helpers for existing dev databases.
- `backend/app/deps.py` contains auth dependencies: `get_current_user()` reads `request.session["user_id"]`; `require_admin()` gates admin routes.
- Backend features follow a consistent split:
  - `models/` SQLModel table definitions and relationships
  - `schemas/` request/response DTOs
  - `crud/` database operations
  - `routers/` FastAPI route handlers

### Backend modules

Core entities include users/roles, fund data, asset management companies, sub-investment types, investments, and audit logs. Admin CRUD routes use `require_admin`; authenticated user/report routes use `get_current_user` where needed.

`backend/app/main.py` currently includes routers for:

- `auth`
- `companies`
- `roles`
- `users`
- `fund_data`
- `report`
- `sub_investment_types`
- `investments`

### Frontend layout

- `frontend/src/main.jsx` bootstraps React.
- `frontend/src/App.jsx` defines routes and wraps the app with `ErrorBoundary`, `BrowserRouter`, and `AuthProvider`.
- `frontend/src/context/AuthContext.jsx` loads `/auth/me` on startup and stores `{ user, setUser, loading, logout }`.
- `frontend/src/hooks/useAuth.js` exposes auth context.
- `frontend/src/api/client.js` is the shared Axios instance. It uses `baseURL: '/api/v1'`, `withCredentials: true`, and redirects most 401s to `/login` while excluding `/auth/login` and `/auth/me`.
- `frontend/src/components/layout/PrivateRoute.jsx` protects authenticated routes and redirects non-admin users away from admin pages.
- Admin pages are nested under `/admin` through `AdminDashboard` and render their section content through React Router `<Outlet />`.

### Frontend routes

- `/login` — login page; redirects authenticated users by role
- `/admin` — admin dashboard shell
- `/admin/roles` — role management
- `/admin/users` — user management
- `/admin/companies` — asset management company management
- `/admin/sub-investment-types` — sub-investment type management
- `/admin/investments` — investment management
- `/dashboard` — regular user dashboard/report view

## Project-Specific Rules

1. Keep auth session-based. Do not introduce JWTs. Session cookies must remain `HttpOnly` and `SameSite=Lax`.
2. Admin-only backend routes must use `require_admin` from `backend/app/deps.py`; frontend admin UI must also check `user.role.name === 'admin'`.
3. Use the shared Axios client in `frontend/src/api/client.js` for frontend API calls so cookies are included.
4. Financial fields must use `Decimal` in Python and SQLModel `Field(max_digits=..., decimal_places=...)`; never use `float` for money/NAV/unit values.
5. SQLModel `create_all()` only creates missing tables. New columns for an existing dev database need explicit ALTER/update handling or a migration path.
6. Use Pydantic/SQLModel schemas for API boundaries; avoid returning lazy ORM relationships unless they are explicitly loaded/serialized.
7. Recharts components should render only when report data exists.
8. Keep React styling in Tailwind utility classes; do not add inline styles for normal UI work.
9. This project is developed through sequential specs in `.claude/specs/`. Use the `create-spec` skill for new roadmap features.
