# CLAUDE.md — XYZ Investment Reporting Software

## Project Overview
Mini investment reporting tool. Admin inputs fund data; users view reports + charts.

---

## Tech Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| DB        | MySQL                         |
| Backend   | FastAPI + SQLModel            |
| Auth      | Session-based (no JWT)        |
| Frontend  | ReactJS + Recharts + Tailwind |

---

## Repository Structure

```
xyz-investment/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── role.py
│   │   │   └── fund_data.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── roles.py
│   │   │   ├── users.py
│   │   │   └── fund_data.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── role.py
│   │   │   └── fund_data.py
│   │   ├── crud/
│   │   │   ├── user.py
│   │   │   ├── role.py
│   │   │   └── fund_data.py
│   │   ├── deps.py
│   │   └── config.py
│   ├── requirements.txt
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   └── client.js
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── Navbar.jsx
    │   │   ├── admin/
    │   │   │   ├── RoleManager.jsx
    │   │   │   ├── UserManager.jsx
    │   │   │   └── FundDataForm.jsx
    │   │   └── user/
    │   │       ├── ReportTable.jsx
    │   │       └── ReportChart.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── AdminDashboard.jsx
    │   │   └── UserDashboard.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── hooks/
    │   │   └── useAuth.js
    │   ├── App.jsx
    │   └── main.jsx
    ├── tailwind.config.js
    ├── vite.config.js
    └── package.json
```

---

## Database Schema

```sql
-- roles
CREATE TABLE role (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL  -- 'admin' | 'user'
);

-- users
CREATE TABLE user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (role_id) REFERENCES role(id)
);

-- fund data
CREATE TABLE fund_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    investment DECIMAL(18,4) NOT NULL,
    market_value DECIMAL(18,4) NOT NULL,
    nav DECIMAL(18,4) NOT NULL,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES user(id)
);
```

---

## Backend Conventions

- **Auth**: Session cookie via `itsdangerous` or FastAPI `SessionMiddleware`. No JWT.
- **ORM**: SQLModel (combines SQLAlchemy + Pydantic).
- **Router prefix**: `/api/v1/`
- **CORS**: Allow frontend origin in dev (`localhost:5173`).
- **Password**: Hash with `passlib[bcrypt]`.
- **Env vars**: DB URL in `.env`, loaded via `pydantic-settings`.

### Key Endpoints

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
GET    /api/v1/auth/me

GET    /api/v1/roles
POST   /api/v1/roles

GET    /api/v1/users
POST   /api/v1/users
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}

GET    /api/v1/fund-data?from_date=&to_date=
POST   /api/v1/fund-data
PUT    /api/v1/fund-data/{id}
DELETE /api/v1/fund-data/{id}
```

### Dependency Pattern

```python
# deps.py
def get_current_user(session: Session = Depends(get_session), ...) -> User: ...
def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role.name != "admin": raise HTTPException(403)
    return user
```

---

## Frontend Conventions

- **State**: React Context for auth (`AuthContext`), local state for forms.
- **API calls**: Axios instance in `src/api/client.js` with `withCredentials: true`.
- **Routing**: React Router v6. Protected routes via `<PrivateRoute>` wrapper.
- **Role-based rendering**: Check `user.role` from context; redirect accordingly.
- **Charts**: Recharts `ComposedChart` with `Line` for Investment, MarketValue, NAV.
- **Date inputs**: Native `<input type="date">` for from/to filter.
- **Tailwind**: Use `tailwind.config.js` for custom brand colors if needed.

### Auth Flow

```
Login page → POST /auth/login → server sets cookie
→ GET /auth/me on app load → populate AuthContext
→ role === 'admin' → AdminDashboard
→ role === 'user'  → UserDashboard
```

---

## Dev Setup

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
# Set DATABASE_URL in .env
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev   # vite on :5173
```

### requirements.txt
```
fastapi
uvicorn[standard]
sqlmodel
pymysql
cryptography
passlib[bcrypt]
python-multipart
pydantic-settings
itsdangerous
starlette
```

---

## Key Rules

1. Admin-only routes guarded by `require_admin` dep on backend + role check on frontend.
2. No JWT — sessions only. Cookie must be `HttpOnly`, `SameSite=Lax`.
3. All money fields `DECIMAL(18,4)` — never `FLOAT`.
4. Fund data `GET` always requires `from_date` + `to_date` query params.
5. Chart renders only when report data exists (no empty Recharts render).
6. Migrations: use SQLModel `create_all` for dev; Alembic for prod.
