Implement Investment Details Management Module

Add a new Investment Details module in the Admin Panel that allows administrators to create, update, view, and delete investment performance records for each Investment Type.

Relationship
Asset Management Company
     ↓
Investment Type
     ↓
Investment
     ↓
Investment Details

Form Fields
Investment Date → Manual entry (Date Picker)
Investment Amount → Auto-populated from the selected Investment record (read-only)
Market Value → Manual entry
NAV → Manual entry
Gain/Loss → System-calculated field
Gain/Loss Calculation
Gain/Loss = Market Value - Investment Amount

The value should be automatically recalculated whenever the Market Value changes.

Functional Requirements
Create Investment Details
View Investment Details
Update Investment Details
Delete Investment Details
Filter records by AMC, Investment Type, and Investment
Validation Rules
Investment Date is required.
Investment Amount must be auto-loaded and read-only.
Market Value is required and must be greater than or equal to zero.
NAV is required and must be greater than zero.
Gain/Loss must be system-calculated and non-editable.
Expected Outcome

Administrators should be able to maintain periodic investment valuation records (Market Value and NAV) for each investment, while the system automatically calculates and stores Gain/Loss based on the recorded market value and original investment amount.