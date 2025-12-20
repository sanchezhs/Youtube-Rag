import sqlalchemy as sa

from core.logging import logger

from shared.db.session import engine

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

def create_notify_trigger():
    try:
        with engine.begin() as conn:
            conn.execute(sa.text(CREATE_NOTIFY_FUNC))
            conn.execute(sa.text(CREATE_TRIGGER_SQL))
            
        logger.info("Postgres notification triggers verified/created.")
    except Exception as e:
        logger.error(f"Failed to setup DB Triggers: {e}")
        logger.error("Worker will fallback to polling loop if triggers are missing.")

