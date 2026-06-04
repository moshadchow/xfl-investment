Implement Investment Details Dashboard Module

Add a new Investment Details Dashboard in the User Panel that allows users to view historical investment performance and valuation records for investments under a selected Asset Management Company.

Objective

Provide users with a dashboard to analyze investment performance over time using tabular data and graphical visualization.

Filter Parameters

Provide the following search/filter controls:

From Date (Date Picker)
To Date (Date Picker)
Asset Management Company (Dropdown)
Investment Type (Dropdown)
Investment (Dropdown)
Dynamic Filtering

Select AMC
     ↓
Load Investment Types
     ↓
Select Investment Type
     ↓
Load Investments
     ↓
Display Investment Details
Investment Performance Data Table

Display historical investment valuation records with the following columns:

Date
Investment Amount (Read-only)
Market Value (Read-only)
NAV (Read-only)
Gain/Loss (System Calculated)
Gain/Loss Calculation
Gain/Loss = Market Value - Investment Amount

Gain/Loss should be calculated by the backend and returned as part of the dataset to ensure consistency and auditability.

Investment Performance Chart

Display a date-wise Gain/Loss column chart based on the filtered investment records.

Chart Requirements
Technology: Recharts

Chart Type: Vertical Bar/Column Chart

X-Axis: Date
Y-Axis: Gain/Loss
Tooltip Support
Responsive Layout
Support for positive and negative Gain/Loss values

Backend Requirements
Create APIs to retrieve filtered investment performance records.

Support filtering by:
Date Range
Asset Management Company
Investment Type
Investment
Calculate and return Gain/Loss for each record.
Return aggregated data suitable for chart rendering.

Frontend Requirements

Implement filter section with cascading dropdowns.
Display investment performance records in a paginated data table.
Render the Gain/Loss chart using Recharts.
Refresh table and chart automatically when filters change.
Handle empty states, loading states, and API errors gracefully.
Expected Outcome

Users should be able to view historical investment valuation records, including Investment Amount, Market Value, NAV, and Gain/Loss, for selected investments. The dashboard should provide both tabular and graphical views of performance trends, enabling users to analyze investment growth or decline over time through an interactive Gain/Loss chart.