---
description: Create a spec file and feature branch for the next XFL Investment Reporting step
argument-hint: "Step number and feature name e.g. 2 role-management"
allowed-tools: Read, Write, Glob, Bash(git:*)
---

You are a senior developer building the XFL Investment Reporting Software.
Always follow the rules in CLAUDE.md.

User input: $ARGUMENTS

## Step 1 — Check working directory is clean
Run `git status` and check for uncommitted, unstaged, or
untracked files. If any exist, stop immediately and tell
the user to commit or stash changes before proceeding.
DO NOT CONTINUE until the working directory is clean.

## Step 2 — Parse the arguments
From $ARGUMENTS extract:

1. `step_number` — zero-padded to 2 digits: 2 → 02, 11 → 11

2. `feature_title` — human readable title in Title Case
   - Example: "Role Management" or "Fund Data Entry"

3. `feature_slug` — git and file safe slug
   - Lowercase, kebab-case
   - Only a-z, 0-9 and -
   - Maximum 40 characters
   - Example: role-management, fund-data-entry

4. `branch_name` — format: `feature/<feature_slug>`
   - Example: `feature/role-management`

If you cannot infer these from $ARGUMENTS, ask the user
to clarify before proceeding.

## Step 3 — Check branch name is not taken
Run `git branch` to list existing branches.
If `branch_name` is already taken, append a number:
`feature/role-management-01`, `feature/role-management-02` etc.

## Step 4 — Switch to main and pull latest
Run:
```
git checkout main
git pull origin main
```

## Step 5 — Create and switch to the feature branch
Run:
```
git checkout -b <branch_name>
```

## Step 6 — Research the codebase
Read these files before writing the spec:
- `CLAUDE.md` — roadmap, conventions, schema, key rules
- `backend/app/main.py` — existing FastAPI routes and middleware
- `backend/app/database.py` — SQLModel engine and session setup
- `backend/app/models/` — existing SQLModel table definitions
- `backend/app/deps.py` — existing dependency functions (get_current_user, require_admin)
- `frontend/src/App.jsx` — existing routes and layout structure
- `frontend/src/context/AuthContext.jsx` — auth state shape
- All files in `.claude/specs/` — avoid duplicating existing specs

Check `CLAUDE.md` to confirm the requested step is not already
marked complete. If it is, warn the user and stop.

## Step 7 — Write the spec
Generate a spec document with this exact structure:

---
# Spec: <feature_title>

## Overview
One paragraph describing what this feature does and why
it exists at this stage of the XFL Investment Reporting roadmap.

## Depends on
Which previous steps this feature requires to be complete.

## Backend routes
Every new backend route needed:
- `METHOD /api/v1/path` — description — access level (public/admin-only/authenticated)

If no new routes: state "No new routes".

## Frontend routes
Every new React Router path needed:
- `/path` — component — who can access (admin/user/public)

If no new frontend routes: state "No new frontend routes".

## Database changes
Any new tables, columns, or constraints needed.
Always verify against `backend/app/models/` before writing this.
State the full SQLModel class definition for any new model.
If none: state "No database changes".

## Backend files to change
Every backend file that will be modified or created.
Group by: models/, routers/, crud/, schemas/, other.

## Frontend files to change
Every frontend file that will be modified or created.
Group by: pages/, components/admin/, components/user/, components/layout/, context/, hooks/, api/.

## New dependencies
- **Backend** (pip): list any new packages for `requirements.txt`. If none: state "None".
- **Frontend** (npm): list any new packages for `package.json`. If none: state "None".

## Rules for implementation
Specific constraints Claude must follow. Always include:
- No JWT — session cookie only (`HttpOnly`, `SameSite=Lax`)
- All money/financial fields must use `DECIMAL(18,4)` — never `FLOAT`
- Passwords hashed with `passlib[bcrypt]` — never stored plain
- Admin-only routes must use `require_admin` dep from `deps.py`
- Frontend API calls must use the Axios instance from `src/api/client.js` with `withCredentials: true`
- All React components use Tailwind utility classes only — no inline styles
- Charts (Recharts) must not render when data array is empty

## Definition of done
A specific testable checklist. Each item must be verifiable
by running the backend + frontend locally.
---

## Step 8 — Save the spec
Save to: `.claude/specs/<step_number>-<feature_slug>.md`

## Step 9 — Report to the user
Print a short summary in this exact format:
```
Branch:    <branch_name>
Spec file: .claude/specs/<step_number>-<feature_slug>.md
Title:     <feature_title>
```

Then tell the user:
"Review the spec at `.claude/specs/<step_number>-<feature_slug>.md`
then enter Plan Mode with Shift+Tab twice to begin implementation."

Do not print the full spec in chat unless explicitly asked.
