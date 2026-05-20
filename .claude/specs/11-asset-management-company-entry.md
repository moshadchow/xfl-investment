# Spec: Asset Management Company Entry

## Overview
Add an Asset Management Company entity so fund data entries can be grouped by the company that manages them. This enables multi-company reporting — admins can manage companies and assign fund entries to specific companies, while users can filter reports by company.

## Depends on
- 02-database-models (fund_data table exists)
- 07-admin-fund-data (admin CRUD patterns established)

## Backend routes
- `GET /api/v1/companies` — list all companies — admin-only
- `POST /api/v1/companies` — create a company — admin-only
- `PUT /api/v1/companies/{id}` — update a company — admin-only
- `DELETE /api/v1/companies/{id}` — delete a company — admin-only

## Frontend routes
No new frontend routes. Company management UI will be added as a new section in the existing `/admin` page. Report filtering by company will be added to the existing `/dashboard` page.

## Database changes
New table: `asset_management_company`

```python
class AssetManagementCompany(SQLModel, table=True):
    __tablename__ = "asset_management_company"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200, unique=True, nullable=False)
```

Modified table: `fund_data` — add `company_id` foreign key column:

```python
# Add to FundData model:
company_id: Optional[int] = Field(default=None, foreign_key="asset_management_company.id")
company: Optional["AssetManagementCompany"] = Relationship(back_populates="fund_entries")
```

The `company_id` is nullable so existing fund data entries remain valid without migration. Existing rows will have `company_id = NULL` (unassigned).

## Backend files to change

**models/**:
- New: `backend/app/models/company.py` — `AssetManagementCompany` SQLModel table
- Modify: `backend/app/models/fund_data.py` — add `company_id` FK + relationship
- Modify: `backend/app/models/__init__.py` — export `AssetManagementCompany`

**schemas/**:
- New: `backend/app/schemas/company.py` — `CompanyCreate`, `CompanyRead`
- Modify: `backend/app/schemas/fund_data.py` — add optional `company_id` to create/update, add `company` to read

**crud/**:
- New: `backend/app/crud/company.py` — full CRUD for companies
- Modify: `backend/app/crud/fund_data.py` — pass `company_id` through create/update, include in `_to_read`

**routers/**:
- New: `backend/app/routers/companies.py` — admin-only CRUD endpoints
- Modify: `backend/app/routers/fund_data.py` — pass `company_id` to create/update
- Modify: `backend/app/routers/report.py` — add optional `company_id` query param filter
- Modify: `backend/app/main.py` — register companies router

## Frontend files to change

**components/admin/**:
- New: `frontend/src/components/admin/CompanyManager.jsx` — table + create/edit form for companies
- Modify: `frontend/src/components/admin/FundDataForm.jsx` — add company dropdown to create/edit form, show company name in table

**components/user/**:
- Modify: `frontend/src/components/user/ReportTable.jsx` — add optional company column
- Modify: `frontend/src/components/user/GainLossChart.jsx` — filter by selected company if applicable

**pages/**:
- Modify: `frontend/src/pages/AdminDashboard.jsx` — add CompanyManager section
- Modify: `frontend/src/pages/UserDashboard.jsx` — add company filter dropdown

## New dependencies
- **Backend** (pip): None
- **Frontend** (npm): None

## Rules for implementation
- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`)
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`
- Admin-only routes must use `require_admin` dep from `deps.py`
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`
- All React components use Tailwind utility classes only — no inline styles
- Charts (Recharts) must not render when data array is empty
- `company_id` on fund_data is nullable — existing entries remain valid
- Company name must be unique (enforce at DB + schema level)
- Deleting a company does NOT delete associated fund data (set `company_id` to NULL or block deletion if entries exist — prefer blocking with a clear error)
- Use existing CRUD patterns from `fund_data.py` (explicit `_to_read` serializer with `session.refresh`)
- The company filter on the user report page is optional — "All Companies" is the default (no filter)

## Definition of done
- [ ] Admin can create, list, edit, and delete asset management companies via the admin dashboard
- [ ] Admin can assign a company to a fund data entry (create or edit)
- [ ] Fund data table in admin dashboard shows company name
- [ ] User report table and chart can be filtered by company
- [ ] Deleting a company that has fund entries returns an error (not a silent cascade)
- [ ] Existing fund data entries with no company assigned still display correctly
- [ ] All existing tests/manual checks from specs 07 and 08 still pass
