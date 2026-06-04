# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XFL Investment is a mini investment reporting tool. Admin users manage roles, permissions, reference data, investments, and investment detail entries; regular users view their dashboard reports and charts.

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

There is no backend test runner configured in `requirements.txt` at this time, so there is no project command for running all tests or a single backend test.

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run build
npm run preview
```

`frontend/package.json` currently defines only `dev`, `build`, and `preview`; there are no configured lint or test scripts, so there is no project command for running all tests or a single frontend test. Vite dev server runs on port 5173 and proxies `/api` to `http://localhost:8000`.

## High-Level Architecture

### Backend layout

- `backend/app/main.py` creates the FastAPI app, configures session and CORS middleware, runs startup DB setup/seeding, and mounts all routers under `/api/v1`.
- `backend/app/config.py` defines `DATABASE_URL`, `SECRET_KEY`, and `ALLOWED_ORIGINS` settings from `.env`.
- `backend/app/database.py` owns the SQLModel engine/session dependency, calls `SQLModel.metadata.create_all()`, seeds default roles, and contains small schema-update helpers for existing dev databases.
- `backend/app/deps.py` contains auth and authorization dependencies: `get_current_user()` reads `request.session["user_id"]`, `require_admin()` checks the admin role name, and `require_permission()` / `require_any_permission()` gate permission-based routes.
- Backend features follow a consistent split:
  - `models/` SQLModel table definitions and relationships
  - `schemas/` request/response DTOs
  - `crud/` database operations
  - `routers/` FastAPI route handlers

### Backend modules

Core entities include users/roles, permissions and role-permission grants, asset management companies, investment types, investments, investment details, and audit logs. Permission definitions are centralized in `backend/app/crud/permission.py` and seeded at startup; the admin role is granted all active permissions.

`backend/app/main.py` currently includes routers for:

- `auth`
- `companies`
- `roles`
- `users`
- `investment_types`
- `investments`
- `investment_details`

### Frontend layout

- `frontend/src/main.jsx` bootstraps React.
- `frontend/src/App.jsx` defines routes and wraps the app with `ErrorBoundary`, `BrowserRouter`, and `AuthProvider`.
- `frontend/src/context/AuthContext.jsx` loads `/auth/me` on startup and stores `{ user, setUser, loading, logout, permissions, hasPermission, hasAnyPermission }`.
- `frontend/src/hooks/useAuth.js` exposes auth context.
- `frontend/src/api/client.js` is the shared Axios instance. It uses `baseURL: '/api/v1'`, `withCredentials: true`, and redirects most 401s to `/login` while excluding `/auth/login` and `/auth/me`.
- `frontend/src/components/layout/PrivateRoute.jsx` protects authenticated routes and redirects users without required permissions back to `/dashboard`.
- Admin pages are nested under `/admin` through `AdminDashboard` and render their section content through React Router `<Outlet />`.
- `frontend/src/components/layout/Sidebar.jsx` is the source of admin navigation links and filters them by permission.

### Frontend routes

- `/login` — login page; redirects authenticated users to their first permitted admin route or `/dashboard`
- `/admin` — redirects to the first permitted admin route or `/dashboard`
- `/admin/roles` — role management, requires `roles.view`
- `/admin/users` — user management, requires `users.view`
- `/admin/companies` — asset management company management, requires `companies.view`
- `/admin/investment-types` — investment type management, requires `investment_types.view`
- `/admin/investments` — investment management, requires `investments.view`
- `/admin/investment-details` — investment detail management, requires `investment_details.view`
- `/dashboard` — authenticated user dashboard/report view

## Project-Specific Rules

1. Keep auth session-based. Do not introduce JWTs. Session cookies must remain `HttpOnly` and `SameSite=Lax`.
2. Backend route protection should use dependencies from `backend/app/deps.py`: use `require_admin` only for role-name admin gates and `require_permission` / `require_any_permission` for permission-based feature access.
3. Frontend admin UI must check permissions with `hasPermission` / `hasAnyPermission`; do not rely only on role name for admin feature visibility.
4. When adding an admin section, update the backend permission catalog, route dependency, `adminRoutePermissions` in `frontend/src/App.jsx`, and `adminLinks` in `frontend/src/components/layout/Sidebar.jsx` together.
5. Use the shared Axios client in `frontend/src/api/client.js` for frontend API calls so cookies are included.
6. Financial fields must use `Decimal` in Python and SQLModel `Field(max_digits=..., decimal_places=...)`; never use `float` for money/NAV/unit values.
7. SQLModel `create_all()` only creates missing tables. New columns for an existing dev database need explicit ALTER/update handling or a migration path.
8. Use Pydantic/SQLModel schemas for API boundaries; avoid returning lazy ORM relationships unless they are explicitly loaded/serialized.
9. Recharts components should render only when report data exists.
10. Keep React styling in Tailwind utility classes; do not add inline styles for normal UI work.
11. This project is developed through sequential specs in `.claude/specs/`. Use the `create-spec` skill for new roadmap features.
