
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import BACKEND_SETTINGS_SPEC, settings
from core.logging import logger
from core.exceptions import AppException
from api.router import api_router
from db.init.notify import create_notify_trigger

from shared.db.init.poblate_settings_table import populate_settings
from shared.db.session import get_db_context
from shared.utils.utils import print_settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting application...")

    # 0. Print settings
    print_settings(logger, settings, "Backend settings:", {"openai_api_key", "database_url"})

    # 1. Poblate settings (if empty) with .env variables
    with get_db_context() as db:
        populate_settings(
            db=db,
            component="backend",
            spec=BACKEND_SETTINGS_SPEC,
            app_settings=settings,
        )

    # 2. Setup Postgres LISTEN/NOTIFY Triggers
    create_notify_trigger()

    yield
    
    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    docs_url=f"{settings.api_v1_prefix}/docs",
    redoc_url=f"{settings.api_v1_prefix}/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.message,
            "details": exc.details,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
    )


# Include routers
app.include_router(api_router, prefix=settings.api_v1_prefix)


# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": f"{settings.api_v1_prefix}/docs",
    }
