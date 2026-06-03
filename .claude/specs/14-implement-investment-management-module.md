# Implement Investment Management Module in Admin Panel

## Objective

Implement a new **Investment Management** module in the Admin Panel that allows administrators to create, view, edit, and manage investment records associated with an Asset Management Company (AMC), Investment Type, and Sub-Investment Type.

The module will act as a centralized repository for investment records and provide a foundation for future portfolio management, investment reporting, NAV tracking, and transaction processing features.

---

# Navigation

Add a new menu under Administration:

```text
Administration
├── Roles Management
├── User Management
├── Asset Management Companies
├── Sub-Investment Types
└── Investments
```

---

# Functional Requirements

## Investment Listing

Create an Investment Management page displaying:

* Investment Code
* Asset Management Company
* Investment Type
* Sub-Investment Type
* Purchase Date
* Purchase Units
* Investment Amount
* Status
* Created Date

Support:

* Search
* Sorting
* Filtering
* Pagination

---

## Create Investment

Administrators should be able to create a new investment record.

### Required Fields

#### Asset Management Information

* Asset Management Company (Dropdown)
* Investment Type (Dropdown)
* Sub-Investment Type (Dropdown)

#### Investment Information

* Purchase Date
* Purchase Units
* Investment Amount

#### Additional Information

* Reference Number (Optional)
* Remarks (Optional)
* Status

---

# Investment Hierarchy

The investment structure should follow:

```text
Asset Management Company
      ↓
Investment Type
      ↓
Sub-Investment Type
      ↓
Investment
```

---

# Dynamic Selection Behavior

### Asset Management Company Selection

When an Asset Management Company is selected:

* Load all Investment Types belonging to the selected AMC.

### Investment Type Selection

When an Investment Type is selected:

* Load all Sub-Investment Types belonging to the selected AMC and Investment Type.

### Sub-Investment Type Selection

* Allow the user to select the appropriate Sub-Investment Type.
* Do not allow manual entry of Investment Type or Sub-Investment Type.

---

# Workflow

```text
Select AMC
      ↓
Load Investment Types
      ↓
Select Investment Type
      ↓
Load Sub-Investment Types
      ↓
Enter Purchase Date
      ↓
Enter Purchase Units
      ↓
Enter Investment Amount
      ↓
Save Investment
```

---

# CRUD Operations

## Create Investment

Allow creation of investment records.

---

## Edit Investment

Allow administrators to update:

* Purchase Date
* Purchase Units
* Investment Amount
* Reference Number
* Remarks
* Status

---

## View Investment

Display complete investment details.

---

## Delete Investment

Allow deletion only when:

* No dependent transactions exist.
* No downstream records reference the investment.

Otherwise prevent deletion and display an appropriate validation message.

---

# Database Design

## investments

```sql
id UUID PRIMARY KEY

investment_code VARCHAR(100) UNIQUE

asset_management_company_id UUID NOT NULL

investment_type VARCHAR(255) NOT NULL

sub_investment_type_id UUID NOT NULL

purchase_date DATE NOT NULL

purchase_units DECIMAL(18,6) NOT NULL

investment_amount DECIMAL(18,2) NOT NULL

reference_number VARCHAR(100)

remarks TEXT

status VARCHAR(50)

created_by UUID

updated_by UUID

created_at TIMESTAMP

updated_at TIMESTAMP
```

---

# Relationships

```text
Asset Management Company
       │
       └── Investment Type
                │
                └── Sub-Investment Type
                        │
                        └── Investment
```

---

# API Requirements

## List Investments

```http
GET /api/admin/investments
```

Supports:

* Pagination
* Search
* Filtering

---

## Get Investment Details

```http
GET /api/admin/investments/{id}
```

---

## Create Investment

```http
POST /api/admin/investments
```

---

## Update Investment

```http
PUT /api/admin/investments/{id}
```

---

## Delete Investment

```http
DELETE /api/admin/investments/{id}
```

---

# Frontend Requirements

## Investment Management Page

Provide:

### Table View

Columns:

* Investment Code
* AMC
* Investment Type
* Sub-Investment Type
* Purchase Date
* Purchase Units
* Investment Amount
* Status

### Actions

* View
* Edit
* Delete

---

## Investment Form

### Asset Management Company

Dropdown

### Investment Type

Dropdown filtered by selected AMC

### Sub-Investment Type

Dropdown filtered by selected AMC and Investment Type

### Purchase Date

Date Picker

### Purchase Units

Numeric Input

### Investment Amount

Numeric Input

### Reference Number

Optional Text Input

### Remarks

Textarea

### Status

Dropdown

---

# Validation Rules

### Asset Management Company

* Required
* Must be active

### Investment Type

* Required
* Must belong to selected AMC

### Sub-Investment Type

* Required
* Must belong to selected Investment Type

### Purchase Date

* Required

### Purchase Units

* Required
* Must be greater than zero

### Investment Amount

* Required
* Must be greater than zero

---

# Future Extensibility

Design the module to support future enhancements:

* Portfolio Holdings
* NAV Tracking
* Dividend Processing
* Investment Redemptions
* Investment Transactions
* Customer Investment Mapping
* Performance Analytics

without requiring significant database redesign.

---

# Expected Outcome

Deliver a complete Investment Management module that allows administrators to maintain investment records linked to Asset Management Companies, Investment Types, and Sub-Investment Types, supports full CRUD operations, enforces data integrity, and provides a scalable foundation for future investment and portfolio management capabilities.
