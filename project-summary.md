  ### Summary of this Application (XFL Investment)

  xfl-investment is an internal investment reporting and administration system. Its main purpose is to let logged-in
  users view investment performance over time, while letting authorized admin users manage the master data and
  transaction records behind those reports.

  In practical terms, it is built for two audiences:

  - Regular users who need to monitor investments and see gain/loss trends.
  - Admin/operations users who maintain companies, investment categories, individual investments, user access, and
    periodic valuation data.

  # User-Centric Summary

  For a normal user, the app acts like an investment dashboard. After signing in, the user can:

  - View investment records in a report table.
  - Filter results by date range, asset management company, investment type, and specific investment.
  - See key values such as investment amount, market value, NAV, and gain/loss.
  - View a gain/loss chart for the filtered data.

  So from a user perspective, the application is mainly for checking “how my investments are performing” across
  different companies and time periods.

  # Admin Features

  For admin or permissioned staff, the app also includes a full back-office area. They can:

  - Manage roles and permissions.
  - Create and manage users, including activation/deactivation.
  - Manage asset management companies.
  - Manage investment types under each company.
  - Create and maintain individual investment records.
  - Add dated investment detail entries such as market value and NAV snapshots.

  This means the reporting dashboard is driven by structured admin-maintained data rather than manual spreadsheets.

  # Key Functional Behaviors

  The application includes:

  - Session-based login/logout.
  - Role-based access control, so users only see screens they are allowed to access.
  - Cascading filters and dropdowns, for example: company -> investment type -> investment.
  - Search, sorting, pagination, and status filtering in admin screens.
  - Automatic gain/loss calculation from investment amount and market value.
  - Audit logging for many create/update/delete actions.
  - Startup seeding for default roles/permissions and support for creating an admin user.

  # Overall Purpose in One Line

  This is a secure internal investment monitoring platform that combines portfolio reporting for end users with admin-
  controlled investment data management and access control behind the scenes.