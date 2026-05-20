from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from sqlmodel import Session

from .config import settings
from .database import create_db_and_tables, engine, seed_roles
from . import models  # noqa: F401 — registers all models with SQLModel.metadata
from .routers import auth, companies, roles, users, fund_data, report


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        seed_roles(session)
    yield


app = FastAPI(
    title="XFL Investment Reporting API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    session_cookie="xfl_session",
    same_site="lax",
    https_only=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(companies.router, prefix="/api/v1", tags=["companies"])
app.include_router(roles.router, prefix="/api/v1", tags=["roles"])
app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(fund_data.router, prefix="/api/v1", tags=["fund-data"])
app.include_router(report.router, prefix="/api/v1", tags=["report"])


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
