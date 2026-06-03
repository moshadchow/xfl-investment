Refactor Administration Module Navigation

Review the current Administration module and separate the following functionalities into independent menu items instead of keeping them on a single page:

Roles Management (Add/Edit/Delete Roles)
User Management (Add/Edit/Delete Users)
Asset Management Companies (Add/Edit/Delete Companies)
Objective

Improve usability, maintainability, and scalability by organizing each administrative function into its own dedicated screen and navigation menu.

Required Changes
1. Roles Management

Create a dedicated menu:

Administration
└── Roles Management

Features:

List Roles
Add New Role
Edit Role
Delete Role
Assign Permissions
2. User Management

Create a dedicated menu:

Administration
└── User Management

Features:

List Users
Add New User
Edit User
Activate/Deactivate User
Assign Roles
3. Asset Management Companies

Create a dedicated menu:

Administration
└── Asset Management Companies

Features:

List Companies
Add New Company
Edit Company
Activate/Deactivate Company
UI/UX Requirements
Remove the current combined page containing all three functions.
Provide separate routes/pages/components for each module.
Update the sidebar/menu navigation accordingly.
Preserve all existing functionality and permissions.
Ensure role-based access control (RBAC) continues to work correctly for each menu.
Expected Outcome

The Administration section should be organized into separate menus for Roles Management, User Management, and Asset Management Companies, resulting in a cleaner UI, improved navigation, and easier long-term maintenance.