# Spec: Layout & Navigation

## Overview
This step completes the admin panel by implementing the `UserManager` component (still a stub) and wiring it into `AdminDashboard`. It also polishes the shared layout — `Navbar` shows the user's role badge alongside the username, `Sidebar` highlights the currently active nav link, and both admin sections (Role Management and User Management) are properly separated with section headings in `AdminDashboard`. No new backend routes or database changes are needed; all required API endpoints (`GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`, `GET /api/v1/roles`) are already implemented.

## Depends on
- Step 03 — Auth (Backend) (`get_current_user`, `require_admin` working)
- Step 04 — Auth (Frontend) (`Navbar`, `Sidebar`, `PrivateRoute`, `AuthContext` working)
- Step 05 — Role Management (Admin) (`GET /api/v1/roles`, `POST /api/v1/roles` working)
- Step 06 — User Management (Admin) (`GET /api/v1/users`, `POST /api/v1/users`, `PATCH /api/v1/users/{id}`, `DELETE /api/v1/users/{id}` working)

## Backend routes
No new routes.

## Frontend routes
No new React Router paths.

## Database changes
No database changes.

## Backend files to change
No backend files change in this step.

## Frontend files to change

**pages/**
- `frontend/src/pages/AdminDashboard.jsx` — add `UserManager` section between `RoleManager` and `FundDataForm`; add section headings (modify)

**components/admin/**
- `frontend/src/components/admin/UserManager.jsx` — implement full component: fetch users + roles in parallel, table with username/role/active status, toggle active (PATCH), delete (DELETE with self-delete guard), create form with username/password/role dropdown (modify)

**components/layout/**
- `frontend/src/components/layout/Navbar.jsx` — add role badge (e.g. `Admin` or `User`) next to username (modify)
- `frontend/src/components/layout/Sidebar.jsx` — highlight active link using `NavLink` with active class instead of plain `Link` (modify)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None. All required packages already in `package.json`.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`).
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT` (not applicable here).
- Passwords hashed with `passlib[bcrypt]` — never stored plain (backend hashes; frontend sends plain).
- Admin-only routes must use `require_admin` dep from `deps.py` (already in place).
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- Charts (Recharts) must not render when data array is empty (not applicable here).
- **UserManager delete**: call `DELETE /api/v1/users/{id}`. Backend already returns 400 if the caller tries to delete their own account; show the error text inline (no confirm dialog required).
- **UserManager toggle active**: call `PATCH /api/v1/users/{id}` with `{ "is_active": <toggled bool> }`. Update row in local state on success.
- **UserManager create**: call `POST /api/v1/users` with `{ username, password, role_id }`. On 409 (duplicate username) show inline error. On success prepend new user to the list and reset the form.
- **UserManager role dropdown**: populated from `GET /api/v1/roles` fetched on mount in parallel with `GET /api/v1/users`.
- **Sidebar active link**: use React Router `NavLink` with a callback `className` that applies `bg-gray-700 text-white` when the link is active and `text-gray-200 hover:bg-gray-700` otherwise.
- **Navbar role badge**: render a small pill/badge (e.g. `<span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Admin</span>`) only when `user.role.name === 'admin'`; show a neutral badge for regular users or omit entirely.
- **Section headings in AdminDashboard**: each section (`Role Management`, `User Management`, `Fund Data`) should have an `<h2>` heading and be separated by `<hr>` dividers.

## Definition of done

- [ ] Visiting `/admin` shows three sections: Role Management, User Management, Fund Data — each with a heading and divider.
- [ ] `UserManager` fetches and displays a table of all users with columns: Username, Role, Active (Yes/No), Actions.
- [ ] Clicking the toggle button on a user row calls `PATCH /api/v1/users/{id}` and flips the Active column without page reload.
- [ ] Clicking Delete on a user row calls `DELETE /api/v1/users/{id}` and removes the row without page reload.
- [ ] Trying to delete your own account shows the backend's `"Cannot delete your own account"` error inline.
- [ ] The create form in `UserManager` accepts username, password, and role — submitting calls `POST /api/v1/users` and prepends the new user to the table.
- [ ] Creating a user with a duplicate username shows the `"Username already taken"` error inline.
- [ ] `Navbar` displays a role badge (e.g. "Admin") alongside the username.
- [ ] `Sidebar` active link is visually highlighted (different background) vs inactive links.
- [ ] No inline styles anywhere — Tailwind classes only.
- [ ] All existing functionality (login, logout, fund data CRUD, report view) continues to work.
