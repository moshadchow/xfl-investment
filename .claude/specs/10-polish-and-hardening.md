# Spec: Polish & Hardening

## Overview
All core features are working. This step hardens the application against common failure modes and fixes the remaining rough edges before the project is considered production-ready. Concretely: (1) an Axios response interceptor auto-redirects to `/login` on any 401 so that expired sessions are handled globally instead of showing cryptic errors; (2) every data-fetching page gets a visible loading state while requests are in flight, replacing the current blank-screen flash; (3) the `POST /auth/login` response inconsistency is fixed — it currently returns `UserRead` (no nested `role`) but the frontend immediately calls `GET /auth/me` to get `UserWithRole`, so the login endpoint should return `UserWithRole` directly to remove the extra round-trip; (4) a global `ErrorBoundary` component wraps the app to catch unexpected React render errors; (5) the `GET /api/v1/report` and `GET /api/v1/fund-data` endpoints are hardened with a date-range guard that rejects queries where `to_date < from_date` (HTTP 422); (6) the `UserDashboard` page title changes to "My Report" to differentiate from the generic "Dashboard" heading.

## Depends on
- Step 03 — Auth (Backend)
- Step 04 — Auth (Frontend)
- Step 07 — Fund Data (Admin)
- Step 08 — Report View (User)
- Step 09 — Layout & Navigation (all components complete)

## Backend routes
No new routes. Two existing endpoints are modified:
- `GET /api/v1/fund-data?from_date=&to_date=` — add guard: raise HTTP 422 if `to_date < from_date` (modify)
- `GET /api/v1/report?from_date=&to_date=` — add same guard (modify)
- `POST /api/v1/auth/login` — change `response_model` from `UserRead` to `UserWithRole` (modify)

## Frontend routes
No new React Router paths.

## Database changes
No database changes.

## Backend files to change

**routers/**
- `backend/app/routers/auth.py` — change `response_model=UserRead` → `response_model=UserWithRole` on the login endpoint (modify)
- `backend/app/routers/fund_data.py` — add date-range validation before calling `get_fund_entries` (modify)
- `backend/app/routers/report.py` — add same date-range validation (modify)

## Frontend files to change

**api/**
- `frontend/src/api/client.js` — add Axios response interceptor: on 401, clear auth context and redirect to `/login` (modify)

**pages/**
- `frontend/src/pages/UserDashboard.jsx` — change `<h1>` text from "Dashboard" to "My Report"; add loading state while fetching (modify)
- `frontend/src/pages/AdminDashboard.jsx` — add loading indicator while UserManager / RoleManager / FundDataForm are mounting (no prop drilling needed — handled inside each component)

**components/layout/**
- `frontend/src/components/layout/ErrorBoundary.jsx` — new class component that catches render errors and shows a plain "Something went wrong" fallback with a reload button (new)

**App.jsx**
- `frontend/src/App.jsx` — wrap the router content in `<ErrorBoundary>` (modify)

**components/user/**
- `frontend/src/components/user/ReportTable.jsx` — add `loading` prop: show a single-row skeleton/spinner row when `loading === true` (modify)

**components/admin/**
- `frontend/src/components/admin/UserManager.jsx` — add `loading` state; show spinner row in table while fetching (modify)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`).
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`.
- Passwords hashed with `passlib[bcrypt]` — never stored plain.
- Admin-only routes must use `require_admin` dep from `deps.py`.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- Charts (Recharts) must not render when data array is empty.
- **Axios 401 interceptor**: attach via `client.interceptors.response.use`. On 401, import and call `logout` from `AuthContext` is not possible without React hooks — instead, set `window.location.href = '/login'` as a simple redirect. Do not redirect on 401 responses to `/api/v1/auth/login` itself (avoid infinite redirect loop): check `error.config.url` and skip the redirect if it includes `/auth/login`.
- **Date-range guard**: in both `fund_data.py` and `report.py`, add `if to_date < from_date: raise HTTPException(status_code=422, detail="to_date must be on or after from_date")` before the CRUD call.
- **Login response fix**: `POST /api/v1/auth/login` must return `UserWithRole` (includes nested `role: { id, name }`). The SQLModel `User` model already has a `role` relationship — changing `response_model=UserRead` to `response_model=UserWithRole` is the only change needed. The frontend `Login.jsx` currently calls `GET /auth/me` after login just to get the role; once the login endpoint returns `UserWithRole`, that second call can be removed and `setUser(loginRes.data)` used directly.
- **ErrorBoundary**: must be a React class component (hooks cannot catch render errors). Renders `{children}` normally; on error shows a centered message with a "Reload page" button (`window.location.reload()`). No inline styles.
- **Loading states**: use a `loading` boolean state initialized to `true`, set to `false` in the `finally` block of the fetch. Show a `<tr><td colSpan={N} className="...">Loading…</td></tr>` row in tables while loading.

## Definition of done

- [ ] `POST /api/v1/auth/login` returns the nested `role` object (e.g. `{ id, username, is_active, role: { id, name } }`).
- [ ] Login page no longer makes a second `GET /auth/me` call after successful login — network tab shows only one API call on login.
- [ ] `GET /api/v1/fund-data?from_date=2024-03-01&to_date=2024-01-01` returns HTTP 422 with `"to_date must be on or after from_date"`.
- [ ] `GET /api/v1/report?from_date=2024-03-01&to_date=2024-01-01` returns HTTP 422 with the same message.
- [ ] When the session expires (cookie cleared manually), any authenticated page redirects automatically to `/login` without showing an error banner.
- [ ] 401 on `/auth/login` itself does NOT redirect — the error message shows inline on the Login page as before.
- [ ] `UserDashboard` shows "My Report" as the page heading.
- [ ] `UserDashboard` shows a "Loading…" row in the table while the initial fetch is in progress.
- [ ] `UserManager` shows a "Loading…" row in the table while the initial fetch is in progress.
- [ ] Deliberately throwing a render error inside a component shows the `ErrorBoundary` fallback rather than a blank white screen.
- [ ] No inline styles anywhere — Tailwind classes only.
- [ ] All existing functionality (login, logout, fund data CRUD, report view, user management) continues to work.
