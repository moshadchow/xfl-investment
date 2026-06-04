Implement Role-Based Access Control (RBAC) with Dynamic Menu Authorization

Implement a comprehensive Role-Based Access Control (RBAC) system where application menus, pages, and features are dynamically controlled by role permissions.

Requirements
Each Role should have configurable permissions assigned to it.
Sidebar menus should be dynamically shown or hidden based on the logged-in user's role permissions.
Users assigned to a role should automatically inherit all permissions associated with that role.
Unauthorized menus, pages, actions, and APIs must not be accessible even through direct URL access.
Menu Authorization

Administrators should be able to assign menu-level permissions such as:

View Menu
Create
Update/Edit
Delete
Approve (where applicable)

Example:

Administration
├── Roles Management
├── User Management
├── Asset Management Companies
├── Investment Types
├── Investments
└── Investment Details

A role with access only to Investments should see only the Investments menu in the sidebar.

Backend Requirements
Implement role, permission, and role-permission mappings.
Enforce permission checks at API and service levels.
Prevent unauthorized access regardless of frontend visibility.
Frontend Requirements
Dynamically render sidebar menus based on permissions returned from the backend.
Hide unauthorized menus, routes, buttons, and actions.
Support permission-based rendering for Create, Edit, Delete, and View actions.
Expected Outcome

Users should only see and access the menus, screens, and actions permitted by their assigned role, ensuring a secure and maintainable RBAC implementation across the entire application.