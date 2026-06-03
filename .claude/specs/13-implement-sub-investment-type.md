## Implement Sub-Investment Type Management Module in Admin Panel

### Objective

Implement a new **Sub-Investment Type Management** module within the Admin Panel to allow authorized administrators to manage Sub-Investment Types under Asset Management Companies (AMCs) and manually entered Investment Types.

The solution should support complete lifecycle management and serve as a configurable master-data module that can be reused throughout the platform without requiring code changes when new classifications are introduced. Investment Type is stored as text on each Sub-Investment Type master record; administrators create new Investment Types by entering a value in the form.

---

## Navigation

Add a new dedicated menu:

```text
Administration
├── Roles Management
├── User Management
├── Asset Management Companies
└── Sub-Investment Types
```

---

## Functional Requirements

### Sub-Investment Type Listing

Create a management screen that displays:

* Sub-Investment Type Name
* Code
* Asset Management Company
* Investment Type
* Status
* Created Date
* Last Updated

Support:

* Search
* Sorting
* Filtering
* Pagination

---

### Create Sub-Investment Type

Administrators should be able to create a new Sub-Investment Type.

Required fields:

* Asset Management Company
* Investment Type
* Sub-Investment Type Name
* Code
* Description (Optional)
* Status (Active/Inactive)

Example:

```text
AMC: ABC Asset Management

Investment Type: Mutual Fund

Sub-Investment Type: Open-End Fund

Code: OPEN_END
```

---

### Edit Sub-Investment Type

Allow administrators to update:

* Sub-Investment Type Name
* Code
* Description
* Status
* Investment Type
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

### investment_sub_types

Fields:

* id
* asset_management_company_id
* investment_type
* investment_type_normalized
* name
* name_normalized
* code
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
        └── Investment Type (text value stored on record)
                    │
                    └── Sub-Investment Type
```

Investment Type must be stored as a string/varchar on the Sub-Investment Type record. Do not require a separate `investment_types` master table solely for dropdown population.

---

## API Requirements

Implement APIs for:

### List

```http
GET /api/admin/sub-investment-types
```

### Details

```http
GET /api/admin/sub-investment-types/{id}
```

### Create

```http
POST /api/admin/sub-investment-types
```

### Update

```http
PUT /api/admin/sub-investment-types/{id}
```

### Delete

```http
DELETE /api/admin/sub-investment-types/{id}
```

### Activate / Deactivate

```http
PATCH /api/admin/sub-investment-types/{id}/status
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
* Investment Type Textbox
* Sub-Investment Type Name
* Code
* Description
* Status

Dynamic behavior:

* Keep Asset Management Company as a dropdown.
* Investment Type must be entered manually by the administrator.
* Do not dynamically load Investment Types for this form.
* Filter Sub-Investment Types by manually entered Investment Type text where needed.

---

## Validation Rules

### Name

* Required
* Combination of Asset Management Company + Investment Type + Sub-Investment Type Name must be unique

### Code

* Required
* Unique across the system

### AMC

* Required
* Must exist
* Must be active

### Investment Type

* Required
* Entered manually by the administrator
* Trim before saving
* Normalize for case-insensitive validation
* Duplicate Investment Type values are allowed within the same AMC only when paired with a different Sub-Investment Type
* The same Asset Management Company + Investment Type + Sub-Investment Type Name combination must not be duplicated

---

## Expected Outcome

Deliver a fully configurable Sub-Investment Type Management module that allows administrators to manage AMC-specific investment classifications through the Admin Panel, supports complete CRUD operations, enforces referential integrity, and is scalable for future investment product hierarchy expansion.
