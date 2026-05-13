# Spec: Fund Data (Admin)

## Overview
This step delivers the Fund Data section of the Admin Dashboard. An admin can view all fund entries filtered by date range, create new entries (date, investment amount, market value, NAV), edit existing entries, and delete entries. The backend already has the complete CRUD layer (`create_fund_entry`, `get_fund_entries`, `get_fund_entry_by_id`, `update_fund_entry`, `delete_fund_entry` in `crud/fund_data.py`) and all schemas (`FundDataCreate`, `FundDataUpdate`, `FundDataRead`) — only the router and frontend component need to be built. All monetary fields use `Decimal` in the model; the API must enforce this. The `created_by` field is set from the logged-in admin's session, never from the request body.

## Depends on
- Step 02 — Database Models (`fund_data` table, CRUD helpers, schemas all complete)
- Step 03 — Auth (Backend) (`require_admin` and `get_current_user` dependencies working)
- Step 05 — Role Management (AdminDashboard layout shell with Navbar + Sidebar in place)

## Backend routes

- `GET /api/v1/fund-data?from_date=YYYY-MM-DD&to_date=YYYY-MM-DD` — list entries in date range — admin-only
- `POST /api/v1/fund-data` — create a new fund entry — admin-only
- `PUT /api/v1/fund-data/{id}` — full update of an entry — admin-only
- `DELETE /api/v1/fund-data/{id}` — delete an entry — admin-only

## Frontend routes
No new React Router paths. Fund data management is rendered as a section inside the existing `/admin` route (`AdminDashboard`), below the existing sections.

## Database changes
No database changes. The `fund_data` table and `FundData` model are complete from Step 02.

## Backend files to change

**routers/**
- `backend/app/routers/fund_data.py` — all four endpoints (new)

**other/**
- `backend/app/main.py` — uncomment and register `fund_data.router` with prefix `/api/v1` (modify)

## Frontend files to change

**components/admin/**
- `frontend/src/components/admin/FundDataForm.jsx` — implement date-range filter + entry list table + create/edit form + delete (modify)

**pages/**
- `frontend/src/pages/AdminDashboard.jsx` — add `<FundDataForm />` section below existing sections (modify)

## New dependencies
- **Backend** (pip): None.
- **Frontend** (npm): None.

## Rules for implementation

- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`).
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`. The `FundData` model uses plain `Decimal`; the `FundDataCreate` and `FundDataRead` schemas also use `Decimal`. The frontend must send numbers as strings or numbers — Axios serialises them correctly.
- Passwords hashed with `passlib[bcrypt]` — never stored plain (not applicable here).
- Admin-only routes must use `require_admin` dep from `deps.py` — all four endpoints must depend on `require_admin`.
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`.
- All React components use Tailwind utility classes only — no inline styles.
- `GET /fund-data` always requires both `from_date` and `to_date` query params — never return unbounded results. Return HTTP 422 if either is missing (FastAPI handles this automatically with required query params).
- `created_by` is set from `current_user.id` in the router — never accepted from the request body.
- `PUT /fund-data/{id}` uses `update_fund_entry(session, id, FundDataUpdate(...))` — the CRUD function uses `exclude_unset=True` so only provided fields are written. For this step the frontend sends all fields (full replace), so it behaves like a true PUT.
- The frontend date-range filter defaults to the current month (first day to today) on mount and fetches automatically.
- Charts (Recharts) must not render when data array is empty — not applicable in this step (charts are in Phase 8), but the fund data fetched here feeds Phase 8.
- Frontend monetary input fields accept decimal numbers (e.g. `<input type="number" step="0.0001">`). Send as numbers to the API; Pydantic coerces to `Decimal`.

## Definition of done

- [ ] `GET /api/v1/fund-data?from_date=2024-01-01&to_date=2024-12-31` returns HTTP 200 with a JSON array of `FundDataRead` objects when called with admin session.
- [ ] `GET /api/v1/fund-data` without `from_date` or `to_date` returns HTTP 422.
- [ ] `GET /api/v1/fund-data?from_date=...&to_date=...` returns HTTP 403 without admin session.
- [ ] `POST /api/v1/fund-data` with valid body returns HTTP 201; `created_by` in response equals the logged-in admin's ID.
- [ ] `PUT /api/v1/fund-data/{id}` with updated values returns HTTP 200 with updated `FundDataRead`.
- [ ] `PUT /api/v1/fund-data/{id}` for a non-existent ID returns HTTP 404.
- [ ] `DELETE /api/v1/fund-data/{id}` returns HTTP 204; entry no longer appears in subsequent GET.
- [ ] `DELETE /api/v1/fund-data/{id}` for a non-existent ID returns HTTP 404.
- [ ] `GET http://localhost:8000/docs` shows four endpoints under the `fund-data` tag.
- [ ] Visiting `/admin` as admin shows the Fund Data section with a date-range filter pre-populated to the current month.
- [ ] Changing the date range and clicking "Filter" fetches and displays entries within that range.
- [ ] Submitting the create form with valid values adds the entry to the list without page reload.
- [ ] Clicking Edit on a row populates the form fields for editing; submitting updates the row in place.
- [ ] Clicking Delete on a row removes it from the list without page reload.
- [ ] `investment`, `market_value`, and `nav` display with at least 4 decimal places in the table.
- [ ] No inline styles anywhere — Tailwind classes only.
