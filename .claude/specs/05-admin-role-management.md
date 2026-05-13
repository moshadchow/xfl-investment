# Spec: Role Management (Admin)

## Overview
This step delivers the Roles section of the Admin Dashboard. An admin can view all roles currently in the database and create new named roles. The two seed roles (`admin`, `user`) already exist from Phase 02; this feature makes roles visible and extensible through the UI without requiring a database client. The backend already has full CRUD helpers (`get_all_roles`, `create_role`, `get_role_by_name` in `crud/role.py`) and the `RoleRead` schema — only the router and the frontend component need to be built.

## Depends on
- Step 02 — Database Models (`role` table, `RoleRead` schema, `crud/role.py` helpers all complete)
- Step 03 — Auth (Backend) (`require_admin` dependency working)
- Step 04 — Auth (Frontend) (admin route guard, `AdminDashboard` shell, `Navbar`/`Sidebar` layout working)

## Backend routes

- `GET /api/v1/roles` — list all roles — admin-only
- `POST /api/v1/roles` — create a new role — admin-only

## Frontend routes
No new React Router paths. Role management is rendered as a section inside the existing `/admin` route (`AdminDashboard`).

## Database changes
No database changes. The `role` table and `Role` model are complete from Step 02.

## Backend files to change

**routers/**
- `backend/app/routers/roles.py` — `GET /roles` and `POST /roles` endpoints (new)

**other/**
- `backend/app/main.py` — uncomment and register `roles.router` with prefix `/api/v1` (modify)

**schemas/**
- No changes. `RoleRead` in `backend/app/schemas/role.py` is sufficient. Add `RoleCreate` schema with a single `name: str` field for the POST body.

Actually: `backend/app/schemas/role.py` — add `RoleCreate` schema (modify)

## Frontend files to change

**components/admin/**
- `frontend/src/components/admin/RoleManager.jsx` — implement role list + create form (modify)

**pages/**
- `frontend/src/pages/AdminDashboard.jsx` — render `<RoleManager />` inside the dashboard layout with `<Navbar>` and `<Sidebar>` (modify)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`).
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT` (not applicable here).
- Passwords hashed with `passlib[bcrypt]` — never stored plain (not applicable here).
- Admin-only routes must use `require_admin` dep from `deps.py` — both `GET /roles` and `POST /roles` must depend on `require_admin`.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- Charts (Recharts) must not render when data array is empty (not applicable here).
- `POST /roles` must check for duplicate names before inserting — use `get_role_by_name`; if already exists return HTTP 409 `"Role already exists"`.
- `RoleCreate.name` must be validated: strip whitespace, enforce non-empty, enforce max 50 chars (matches DB column).
- The create form must clear after successful submission and re-fetch the list.
- `GET /roles` response: `list[RoleRead]` — never expose user passwords or unrelated data.

## Definition of done

- [ ] `GET /api/v1/roles` returns HTTP 200 with a JSON array of `RoleRead` objects when called with a valid admin session.
- [ ] `GET /api/v1/roles` returns HTTP 403 when called without a session or with a non-admin session.
- [ ] `POST /api/v1/roles` with `{"name": "analyst"}` returns HTTP 201 with the new `RoleRead` object.
- [ ] `POST /api/v1/roles` with a duplicate name returns HTTP 409 `"Role already exists"`.
- [ ] `POST /api/v1/roles` returns HTTP 403 when called without admin session.
- [ ] `GET http://localhost:8000/docs` shows two endpoints under the `roles` tag.
- [ ] Visiting `/admin` as an admin shows the Role Manager section with the existing roles listed (`admin`, `user`).
- [ ] Submitting the create-role form with name `"analyst"` adds it to the list without a page reload.
- [ ] Submitting the create-role form with an already-existing name shows an inline error message.
- [ ] Submitting an empty name is blocked by form validation (HTML required or client-side check) before hitting the API.
- [ ] The Navbar shows the logged-in admin's username and a working Logout button on the `/admin` page.
- [ ] The Sidebar shows both `Dashboard` and `Admin Panel` links for the admin user.
- [ ] No inline styles anywhere — Tailwind classes only.
