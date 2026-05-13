# Spec: Auth (Frontend)

## Overview
This step wires the frontend authentication layer. The backend already exposes `POST /auth/login`, `POST /auth/logout`, and `GET /auth/me`. The frontend scaffold has stub pages (Login, AdminDashboard, UserDashboard), a working Axios client, and an `AuthContext` that calls `GET /auth/me` on mount — but Login submits nothing and there is no route protection. This step implements the Login page form, adds a `logout` action to `AuthContext`, wraps protected routes in a `<PrivateRoute>` component that redirects unauthenticated users to `/login`, and performs a role-based redirect so admins land on `/admin` and regular users on `/dashboard`.

## Depends on
- Step 01 — Project Setup (React + Vite + Tailwind + React Router wired, Axios client configured)
- Step 03 — Auth (Backend) (`POST /auth/login`, `POST /auth/logout`, `GET /auth/me` working; session cookie set by backend)

## Backend routes
No new routes. All three auth endpoints from Step 03 are consumed as-is.

## Frontend routes
No new React Router paths. Existing paths `/login`, `/admin`, `/dashboard` are guarded:
- `/login` — `Login` — public (redirect to role dashboard if already logged in)
- `/admin` — `AdminDashboard` — admin only (redirect to `/login` if unauthenticated, `/dashboard` if role !== admin)
- `/dashboard` — `UserDashboard` — authenticated (redirect to `/login` if unauthenticated)

## Database changes
No database changes.

## Backend files to change
No backend files change in this step.

## Frontend files to change

**context/**
- `frontend/src/context/AuthContext.jsx` — add `logout` function that calls `POST /auth/logout` and clears user state (modify)

**pages/**
- `frontend/src/pages/Login.jsx` — implement form with username + password fields, call `POST /auth/login`, redirect to `/admin` or `/dashboard` based on `role.name`, show inline error on 401 (modify)

**components/layout/**
- `frontend/src/components/layout/Navbar.jsx` — show username + Logout button; call `logout()` from context on click; hide when user is null (modify)
- `frontend/src/components/layout/Sidebar.jsx` — show role-appropriate nav links (admin sees all; user sees only dashboard); hide when user is null (modify)

**App.jsx**
- `frontend/src/App.jsx` — wrap `/admin` and `/dashboard` routes in `<PrivateRoute>`; wrap `/login` in a redirect-if-logged-in guard (modify)

**New component**
- `frontend/src/components/layout/PrivateRoute.jsx` — renders `<Outlet />` if authenticated (and role matches if `adminOnly` prop), otherwise redirects (new)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None. All required packages (React Router, Axios, Tailwind) are already in `package.json`.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`). The cookie is set by the backend; the frontend never reads or stores it manually.
- All React components use Tailwind utility classes only — no inline styles.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true` (already configured).
- `AuthContext` must expose `{ user, setUser, loading, logout }`. `logout` calls `POST /api/v1/auth/logout` then sets `user` to `null`.
- Login page must not redirect until `loading === false` (avoid flash of redirect before `/auth/me` resolves).
- `PrivateRoute` must show nothing (or a spinner) while `loading === true` — never redirect during loading.
- If already logged in and navigating to `/login`, redirect to `/admin` (admin role) or `/dashboard` (user role).
- Admin route guard: if authenticated but `user.role.name !== "admin"`, redirect to `/dashboard` (not to `/login`).
- Login form error: display the backend's `detail` string on 401/403, e.g. `"Invalid credentials"` or `"Account disabled"`. Do not show a generic message.
- Navbar `Logout` button calls `logout()` from `useAuth()` — after logout, navigate to `/login`.
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT` (not applicable to auth but enforced globally).
- Passwords hashed with `passlib[bcrypt]` — never stored plain (backend concern; frontend sends plain over HTTPS).
- Charts (Recharts) must not render when data array is empty (not applicable this step).

## Definition of done

- [ ] Visiting `/login` when already authenticated redirects immediately to `/admin` (admin) or `/dashboard` (user).
- [ ] Submitting the Login form with valid admin credentials redirects to `/admin` and the Navbar shows the username.
- [ ] Submitting the Login form with valid user credentials redirects to `/dashboard`.
- [ ] Submitting the Login form with wrong credentials shows the error text `"Invalid credentials"` inline (no full-page reload).
- [ ] Visiting `/admin` when not logged in redirects to `/login`.
- [ ] Visiting `/admin` when logged in as a non-admin user redirects to `/dashboard`.
- [ ] Visiting `/dashboard` when not logged in redirects to `/login`.
- [ ] Clicking Logout on the Navbar calls `POST /auth/logout`, clears `user` from context, and redirects to `/login`.
- [ ] After logout, pressing browser Back does not restore an authenticated session (navigating back to `/admin` or `/dashboard` redirects to `/login`).
- [ ] `loading` spinner/blank renders during the initial `/auth/me` fetch — no flash of the wrong route.
- [ ] Navbar and Sidebar render correctly: show username and logout for logged-in users, nothing/hidden for unauthenticated state.
- [ ] No inline styles anywhere — Tailwind classes only.
