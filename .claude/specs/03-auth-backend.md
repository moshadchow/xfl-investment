# Spec: Auth (Backend)

## Overview
This step implements the three core auth endpoints (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me`) and upgrades `deps.py` from stub raises to real session-based guards. The session is stored entirely server-side using Starlette `SessionMiddleware` (itsdangerous signed cookie). No JWT is used at any point. After this step the frontend's `AuthContext` (which already calls `GET /auth/me` on mount) will receive a real user payload and the `get_current_user` / `require_admin` dependencies will gate all subsequent routes correctly.

## Depends on
- Step 01 — Project Setup (FastAPI app, SessionMiddleware, CORS wired in `main.py`)
- Step 02 — Database Models (User/Role models, CRUD helpers, `verify_password` from `crud/user.py`, schemas available)

## Backend routes

- `POST /api/v1/auth/login` — verify username + hashed password, write `user_id` into `request.session`, return `UserRead` — public
- `POST /api/v1/auth/logout` — clear `request.session`, return `{"detail": "logged out"}` — public (idempotent)
- `GET /api/v1/auth/me` — read `user_id` from session, fetch user, return `UserWithRole` — authenticated (uses `get_current_user`)

## Frontend routes
No new frontend routes. The existing `AuthContext.jsx` already calls `GET /auth/me` and will work once the endpoint is real.

## Database changes
No database changes. All three tables from Step 01/02 are sufficient.

## Backend files to change

**routers/**
- `backend/app/routers/auth.py` — implement login, logout, me endpoints (new)

**other/**
- `backend/app/deps.py` — replace stub raises with real session-based `get_current_user` and `require_admin` (modify)
- `backend/app/main.py` — uncomment and register `auth.router` with prefix `/api/v1` (modify)

**schemas/**
- `backend/app/schemas/auth.py` — `LoginRequest` schema: `username: str`, `password: str` (new)

## Frontend files to change
No frontend files change in this step.

## New dependencies
- **Backend** (pip): None. (`itsdangerous` is a transitive dependency of `starlette`; `passlib[bcrypt]` already in requirements.txt)
- **Frontend** (npm): None.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`). Session data is stored in the signed cookie managed by `SessionMiddleware`; only `user_id` (int) is written into `request.session`.
- Login must call `verify_password` from `backend/app/crud/user.py` — never compare plain text.
- On failed login return HTTP 401 with `detail="Invalid credentials"` — do not distinguish between "user not found" and "wrong password" (prevents username enumeration).
- `GET /auth/me` loads the user via `get_user_by_id` and must eager-load the role so `UserWithRole.role` is populated. Use `session.exec(select(User).where(User.id == uid).options(selectinload(User.role)))` or access `user.role` within the same session.
- `get_current_user` in `deps.py` reads `request.session.get("user_id")`; if absent or user not found, raises HTTP 401.
- `require_admin` in `deps.py` checks `user.role.name == "admin"`; if not, raises HTTP 403.
- `is_active` check: if `user.is_active` is `False`, login must return HTTP 403 with `detail="Account disabled"`.
- Logout calls `request.session.clear()` — no database write needed.
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT` (not applicable to auth but enforced globally).
- Passwords hashed with `passlib[bcrypt]` — never stored plain.
- Admin-only routes must use `require_admin` dep from `deps.py`.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- Charts (Recharts) must not render when data array is empty.

## Definition of done

- [ ] `POST /api/v1/auth/login` with valid credentials returns HTTP 200 and `UserRead` JSON body; response `Set-Cookie` header contains the session cookie.
- [ ] `POST /api/v1/auth/login` with wrong password returns HTTP 401 `{"detail": "Invalid credentials"}`.
- [ ] `POST /api/v1/auth/login` for an `is_active=False` user returns HTTP 403 `{"detail": "Account disabled"}`.
- [ ] `GET /api/v1/auth/me` with the session cookie set returns HTTP 200 with `UserWithRole` JSON including `role.name`.
- [ ] `GET /api/v1/auth/me` without a cookie (or expired session) returns HTTP 401.
- [ ] `POST /api/v1/auth/logout` clears the session; subsequent `GET /auth/me` returns HTTP 401.
- [ ] `get_current_user` dependency raises HTTP 401 when no valid session — any future protected route correctly blocks unauthenticated requests.
- [ ] `require_admin` dependency raises HTTP 403 when user role is not `admin`.
- [ ] `UserWithRole` response never includes `hashed_password`.
- [ ] `uvicorn app.main:app --reload --port 8000` starts without errors; `GET http://localhost:8000/docs` shows three auth endpoints under the `auth` tag.
- [ ] Swagger UI `POST /auth/login` flow: login → copy cookie → `GET /auth/me` returns the logged-in user's data.
