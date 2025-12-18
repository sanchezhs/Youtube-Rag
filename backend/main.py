import sqlalchemy as sa

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.logging import logger
from core.exceptions import AppException
from api.router import api_router
from shared.db.session import engine, Base


CREATE_NOTIFY_FUNC = """
CREATE OR REPLACE FUNCTION notify_new_task() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('task_queue', 'new_task');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
"""

CREATE_TRIGGER_SQL = """
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'task_insert_trigger') THEN
        CREATE TRIGGER task_insert_trigger
        AFTER INSERT ON pipeline_tasks
        FOR EACH ROW
        EXECUTE FUNCTION notify_new_task();
    END IF;
END
$$;
"""

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info("Starting application...")
    
    # 1. Create Tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified")
    
    # 2. Setup Postgres LISTEN/NOTIFY Triggers
    try:
        with engine.begin() as conn:
            conn.execute(sa.text(CREATE_NOTIFY_FUNC))
            conn.execute(sa.text(CREATE_TRIGGER_SQL))
            
        logger.info("Postgres notification triggers verified/created.")
    except Exception as e:
        logger.error(f"⚠️ Failed to setup DB Triggers: {e}")
        logger.error("Worker will fallback to polling loop if triggers are missing.")

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
