## Implement Investment Type Management Module in Admin Panel

### Objective

Implement a new **Investment Type Management** module within the Admin Panel to allow authorized administrators to manage Sub-Investment Types under Asset Management Companies (AMCs) and manually entered Investment Types.

The solution should support complete lifecycle management and serve as a configurable master-data module that can be reused throughout the platform without requiring code changes when new classifications are introduced. Investment Type is stored as text on each Sub-Investment Type master record; administrators create new Investment Types by entering a value in the form.

---

## Navigation

Add a new dedicated menu:

```text
Administration
├── Roles Management
├── User Management
├── Asset Management Companies
└── Investment Types
```

---

## Functional Requirements

### Investment Type Listing

Create a management screen that displays:

* Asset Management Company
* Investment Type Name
* Status
* Created Date
* Last Updated

Support:

* Search
* Sorting
* Filtering
* Pagination

---

### Create Investment Type

Administrators should be able to create a new Investment Type.

Required fields:

* Asset Management Company
* Investment Type
* Description (Optional)
* Status (Active/Inactive)

Example:

```text
AMC: ABC Asset Management

Investment Type: Mutual Fund

```

---

### Edit Investment Type

Allow administrators to update:

* Investment Type Name
* Description
* Status
* Asset Management Company

All modifications must be audited.

---

### Delete Sub-Investment Type

Allow deletion only when:

* No customer records reference the Sub-Investment Type.
* No investment products reference it.
* No active transactions depend on it.

Display appropriate validation messages when deletion is not permitted.

---

### Activate / Deactivate

Allow administrators to:

* Activate Sub-Investment Type
* Deactivate Sub-Investment Type

Inactive records should not appear in customer-facing dropdowns or onboarding forms.

---

## Database Requirements

Create a new table:

### investment_types

Fields:

* id
* asset_management_company_id
* investment_type_name
* description
* is_active
* created_by
* updated_by
* created_at
* updated_at

Relationships:

```text
Asset Management Company
        │
        └── Investment Type (drop-down record based on Asset Management Company)


---

## API Requirements

Implement APIs for:

### List

```http
GET /api/admin/sub-investment-types
```

### Details

```http
GET /api/admin/investment-types/{id}
```

### Create

```http
POST /api/admin/investment-types
```

### Update

```http
PUT /api/admin/investment-types/{id}
```

### Delete

```http
DELETE /api/admin/investment-types/{id}
```

### Activate / Deactivate

```http
PATCH /api/admin/investment-types/{id}/status
```

---

## Frontend Requirements

### Management Page

Create a dedicated page for Sub-Investment Types.

Provide:

* Data Table
* Search
* Filters
* Create Button
* Edit Action
* Delete Action
* Activate/Deactivate Action

---

### Create/Edit Form

Fields:

* Asset Management Company Dropdown
* Investment Type Name Dropdown
* Description
* Status

Dynamic behavior:

* Keep Asset Management Company as a dropdown.
* Investment Type must be dropdown folloed by Asset Management Company.

---

## Validation Rules

### Name

* Required
* Combination of Asset Management Company + Investment Type Name must be unique

### Code

* Required
* Unique across the system

### AMC

* Required
* Must exist
* Must be active

### Investment Type

* Required
* Entered by dropdown by the administrator
* Trim before saving
* Duplicate Investment Type values are not allowed within the same AMC.
* The same Asset Management Company + Investment Type Name combination must not be duplicated

---

## Expected Outcome

Deliver a fully configurable Investment Type Management module that allows administrators to manage AMC-specific investment classifications through the Admin Panel, supports complete CRUD operations, enforces referential integrity, and is scalable for future investment product hierarchy expansion.
