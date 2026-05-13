# Spec: Report View (User)

## Overview
This step delivers the User Dashboard — the read-only report view that regular (non-admin) users see after login. Users can select a date range, view the fund data in a sortable table, and see a `ComposedChart` (Recharts) with three lines: Investment, Market Value, and NAV over time. The backend already exposes `GET /api/v1/fund-data` (admin-only); this step adds a second read-only endpoint accessible to any authenticated user so regular users can fetch data without admin privileges. The `UserDashboard` page shell, `ReportTable`, and `ReportChart` components are all stubs and need to be fully implemented.

## Depends on
- Step 03 — Auth (Backend) (`get_current_user` dependency working)
- Step 04 — Auth (Frontend) (`UserDashboard` route protected by `PrivateRoute`, `Navbar`/`Sidebar` available)
- Step 07 — Fund Data (Admin) (fund data exists in the database to display)

## Backend routes

- `GET /api/v1/report?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` — list fund entries in date range — authenticated (any logged-in user)

## Frontend routes
No new React Router paths. The existing `/dashboard` route renders `UserDashboard`.

## Database changes
No database changes.

## Backend files to change

**routers/**
- `backend/app/routers/report.py` — single `GET /report` endpoint (new)

**other/**
- `backend/app/main.py` — register `report.router` with prefix `/api/v1` (modify)

## Frontend files to change

**pages/**
- `frontend/src/pages/UserDashboard.jsx` — implement layout: Navbar + Sidebar + date filter + ReportTable + ReportChart (modify)

**components/user/**
- `frontend/src/components/user/ReportTable.jsx` — implement data table with date, investment, market value, NAV columns (modify)
- `frontend/src/components/user/ReportChart.jsx` — implement Recharts `ComposedChart` with three `Line` series; must not render when data array is empty (modify)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None. Recharts is already in `package.json`.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`).
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`. Display with `Number(val).toFixed(4)` in the table.
- Passwords hashed with `passlib[bcrypt]` — never stored plain (not applicable here).
- Admin-only routes must use `require_admin` dep from `deps.py` — the new `GET /report` endpoint uses `get_current_user` (not `require_admin`) so regular users can access it.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- **Charts (Recharts) must not render when data array is empty** — `ReportChart` must return `null` (or a "No data" message) when `data.length === 0`.
- `GET /report` always requires both `from_date` and `to_date` query params — FastAPI raises 422 automatically.
- The `FundDataRead` schema is reused as the response type — no new schema needed.
- Default date range on `UserDashboard` mount: first day of current month to today (same as `FundDataForm`).
- `ReportChart` X-axis: `date` field. Y-axis: numeric. Three `Line` series: `investment` (blue), `market_value` (green), `nav` (orange). Include a `Legend` and `Tooltip`.
- `Sidebar` for user role shows only the Dashboard link (already implemented in Phase 4).

## Definition of done

- [ ] `GET /api/v1/report?from_date=2024-01-01&to_date=2024-12-31` returns HTTP 200 with `FundDataRead` array when called with a regular user session.
- [ ] `GET /api/v1/report?from_date=...&to_date=...` returns HTTP 401 without any session.
- [ ] `GET /api/v1/report` without date params returns HTTP 422.
- [ ] `GET http://localhost:8000/docs` shows the endpoint under a `report` tag.
- [ ] Visiting `/dashboard` as a regular user shows the date filter, table, and chart sections.
- [ ] Changing the date range and clicking "Filter" fetches and renders the new data.
- [ ] `ReportTable` displays date, investment (4dp), market value (4dp), NAV (4dp) columns.
- [ ] `ReportChart` renders three lines when data is present; shows nothing (or "No data to display") when the array is empty — no empty Recharts axes rendered.
- [ ] Chart `Tooltip` shows all three values on hover.
- [ ] Chart `Legend` labels the three lines correctly.
- [ ] Navbar shows the logged-in user's username and a working Logout button.
- [ ] Visiting `/dashboard` as admin also works (admin is also authenticated).
- [ ] No inline styles anywhere — Tailwind classes only.
