from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .config import settings
from .database import create_db_and_tables
from . import models  # noqa: F401 — registers all models with SQLModel.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
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

# Routers — registered in later steps:
# from .routers import auth, roles, users, fund_data
# app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
# app.include_router(roles.router, prefix="/api/v1", tags=["roles"])
# app.include_router(users.router, prefix="/api/v1", tags=["users"])
# app.include_router(fund_data.router, prefix="/api/v1", tags=["fund-data"])


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
