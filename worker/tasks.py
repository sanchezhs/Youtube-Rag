import logging
import time
import sys
import signal
import traceback
import select

from datetime import datetime, timezone

from sqlalchemy import select as sql_select, text
from sqlalchemy.orm import Session

from flows.ingest_flow import ingest_channel_flow
from flows.transcribe_flow import transcribe_flow
from flows.chunk_flow import chunk_flow
from flows.embed_flow import embed_flow, embed_question, get_embedding_model

from shared.db.session import SessionLocal, get_db_context
from shared.db.models import PipelineTask, TaskStatus
from shared.db.init.poblate_settings_table import populate_settings

from worker.core.config import settings, WORKER_SETTINGS_SPEC

# CONFIG
POLL_INTERVAL = 5
MAX_RETRIES   = 3

# LOGGING
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("worker")

class GracefulKiller:
    """Watches for Docker/System signals to stop the loop safely."""
    def __init__(self):
        self.kill_now = False
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)

    def exit_gracefully(self, signum, frame):
        logger.info("Receive shutdown signal. Finishing current task then exiting...")
        self.kill_now = True

def reset_stuck_tasks():
    """
    On startup, look for tasks left in RUNNING state from a previous crash.
    Mark them as FAILED (or PENDING to retry).
    """
    with SessionLocal() as db:
        stuck_tasks = db.execute(
            sql_select(PipelineTask).where(PipelineTask.status == TaskStatus.RUNNING)
        ).scalars().all()
        
        if stuck_tasks:
            logger.warning(f"Found {len(stuck_tasks)} stuck tasks. Resetting to FAILED.")
            for task in stuck_tasks:
                task.status = TaskStatus.FAILED
                task.error_message = "Worker crashed or restarted during execution"
                task.completed_at = datetime.now(timezone.utc)
            db.commit()

def update_task_state(db: Session, task: PipelineTask, progress: int, current_result: str | None):
    """
    Updates the task with info for the frontend.
    
    1. progress: 0-100 integer bar.
    """
    task.progress = progress
    if current_result:
        task.result = current_result
    db.commit()

def fetch_next_task(db: Session) -> PipelineTask | None:
    """
    Postgres specific: SKIP LOCKED ensures multiple workers don't grab the same task.
    """
    stmt = (
        sql_select(PipelineTask)
        .where(PipelineTask.status == TaskStatus.PENDING)
        .order_by(PipelineTask.created_at.asc()) # FIFO
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()

def process_single_video(task: PipelineTask, video_id: str, db: Session, base_progress: int, segment_size: float) -> bool:
    """
    Runs the full RAG pipeline for a SINGLE video.
    
    Args:
        base_progress: The progress % where this video starts (e.g., 10)
        segment_size: The total % 'width' this video takes up (e.g., 90 if 1 video)
    """
    try:
        # Calculate sub-steps within the allocated segment size
        # Step 1: Transcribe (Starts immediately at base)
        p_transcribe = base_progress
        update_task_state(db, task, p_transcribe, f"Transcribing video: {video_id}...")
        
        t_res = transcribe_flow(video_ids=[video_id], task_id=str(task.id))
        if t_res['transcribed'] == 0 and t_res['failed'] > 0:
            raise Exception("Transcription failed")

        # Step 2: Chunk (Approx 40% through this video's segment)
        p_chunk = int(base_progress + (segment_size * 0.4))
        update_task_state(db, task, p_chunk, f"Chunking text for: {video_id}...")
        
        chunk_flow(video_ids=[video_id], task_id=str(task.id))
        
        # Step 3: Embed (Approx 70% through this video's segment)
        p_embed = int(base_progress + (segment_size * 0.7))
        update_task_state(db, task, p_embed, f"Generating embeddings for: {video_id}...")
        
        embed_flow(video_ids=[video_id], task_id=str(task.id))

        logger.info(f"[{task.id}] Video {video_id} fully processed.")
        return True

    except Exception as e:
        logger.error(f"[{task.id}] Failed to process video {video_id}: {e}")
        return False

def run_task(task: PipelineTask, db: Session):
    logger.info(f"Starting Task ID: {task.id}")
    
    task.status = TaskStatus.RUNNING
    task.started_at = datetime.now(timezone.utc)
    task.progress = 0 # Ensure we start at 0
    task.result = "Initializing..."
    db.commit()

    try:
        # --- PHASE 1: INGEST ---
        update_task_state(db, task, 5, "Ingesting channel metadata and audio...")
        ingest_result = ingest_channel_flow(
            channel_url=task.request.get("channel_url"),
            max_videos=task.request.get("max_videos", 10),
            download=task.request.get("download", True),
            task_id=str(task.id)
        )
        
        video_ids = ingest_result.get("video_ids", [])
        total_videos = len(video_ids)
        
        if not video_ids:
            logger.warning(f"[{task.id}] No videos found.")
            task.status = TaskStatus.COMPLETED
            task.progress = 100
            task.completed_at = datetime.now(timezone.utc)
            update_task_state(db, task, 100, "Completed. No new videos found.")
            return

        update_task_state(db, task, 10, f"Found {total_videos} new videos. Starting processing...")

        # --- PHASE 2: PROCESSING LOOP ---
        logger.info(f"[{task.id}] Processing {total_videos} videos sequentially")
        
        success_count = 0
        
        # We have 90% of the bar left (10% to 100%)
        start_pct = 10
        pct_per_video = 90.0 / total_videos
        
        for index, video_id in enumerate(video_ids):
            db.refresh(task) 
            if task.status == TaskStatus.FAILED: 
                logger.info("Task cancelled externally.")
                break

            # Calculate base progress for THIS video
            # e.g., Video 0 starts at 10. Video 1 starts at 10 + 45 = 55.
            current_base = int(start_pct + (index * pct_per_video))
            
            # Pass the task object, base, and width to the helper
            is_success = process_single_video(task, video_id, db, current_base, pct_per_video)
            
            if is_success:
                success_count += 1

        task.completed_at = datetime.now(timezone.utc)
        final_msg = f"Finished. {success_count}/{total_videos} videos processed successfully."
        
        if success_count == 0 and total_videos > 0:
            task.status = TaskStatus.FAILED
            task.error_message = "All videos failed to process."
            update_task_state(db, task, 100, "Failed. See logs.")
        elif success_count < total_videos:
            task.status = TaskStatus.COMPLETED
            task.error_message = f"Completed with errors. {success_count}/{total_videos} processed."
            update_task_state(db, task, 100, final_msg)
        else:
            task.status = TaskStatus.COMPLETED
            update_task_state(db, task, 100, final_msg)
            
        logger.info(f"Task {task.id} finished. {success_count}/{total_videos} succeeded.")

    except Exception as e:
        logger.error(f"Critical Task Failure: {e}")
        logger.error(traceback.format_exc())
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
        task.completed_at = datetime.now(timezone.utc)
        update_task_state(db, task, task.progress, "Critical System Error")

    finally:
        db.commit()


def run_embedding(task: PipelineTask, db: Session):
    logger.info(f"Starting Task ID: {task.id}")
    
    task.status = TaskStatus.RUNNING
    task.started_at = datetime.now(timezone.utc)
    update_task_state(db, task, 10, "Calculating embedding...")

    try:
        task.result = embed_question(task.request["question_to_embed"])
        task.status = TaskStatus.COMPLETED
        update_task_state(db, task, 100, None)

    except Exception as e:
        logger.error(f"Critical Task Failure: {e}")
        logger.error(traceback.format_exc())
        task.status = TaskStatus.FAILED
        task.error_message = str(e)
        task.completed_at = datetime.now(timezone.utc)

    finally:
        logger.info(f"Task ID: {task.id} finished: {task.status}")
        db.commit()

def wait_for_notification(db_session: Session, timeout=60):
    """
    Blocks execution until a notification is received from Postgres 
    or the timeout expires.
    """
    # Get the generic connection wrapper
    conn_wrapper = db_session.connection()
    
    # Enable LISTEN
    db_session.execute(text("LISTEN task_queue"))
    db_session.commit()
    
    # We dig into the private attributes to find the raw driver connection
    raw_conn = None
    fd       = None

    try:
        # Access the raw psycopg2 connection object
        if conn_wrapper._dbapi_connection and conn_wrapper._dbapi_connection.driver_connection:
            raw_conn = conn_wrapper._dbapi_connection.driver_connection
            fd = raw_conn.fileno()
    except Exception as e:
        logger.warning(f"Could not extract File Descriptor: {e}")

    # If we couldn't find the FD, sleep and return to avoid tight loop
    if fd is None or raw_conn is None:
        time.sleep(POLL_INTERVAL)
        return

    try:
        # Block until the socket has data (Zero CPU usage)
        if select.select([fd], [], [], timeout) == ([], [], []):
            pass # Timeout occurred
        else:
            # Data received: Poll to process the notification
            raw_conn.poll()
            # Clean up the queue so memory doesn't grow
            while raw_conn.notifies:
                raw_conn.notifies.pop(0)
                
    except Exception as e:
        logger.warning(f"Select failed ({e}), falling back to sleep.")
        time.sleep(POLL_INTERVAL)

def populate_settings_table():
    with get_db_context() as db:
        populate_settings(
            db=db,
            component="worker",
            spec=WORKER_SETTINGS_SPEC,
            app_settings=settings,
        )

if __name__ == "__main__":
    killer = GracefulKiller()

    # 0. Bootstrap settings, if empty
    populate_settings_table()
    
    # 1. Load model
    logger.info("Pre-loading Embedding Model into memory...")
    try:
        get_embedding_model()
        logger.info("Embedding Model Loaded.")
    except Exception as e:
        logger.error(f"Failed to preload model: {e}")

    # 2. Recovery phase
    try:
        reset_stuck_tasks()
    except Exception as e:
        logger.error(f"Error checking stuck tasks: {e}")

    logger.info("Worker started. Waiting for tasks...")

    # 3. Main Loop
    while not killer.kill_now:
        try:
            with SessionLocal() as db:
                # 1. Try to fetch a task immediately
                task = fetch_next_task(db)

                if task:
                    # 2. If task found, run it
                    if task.task_type == "pipeline":
                        run_task(task, db)
                    elif task.task_type == "embed_question":
                        run_embedding(task, db)
                    else:
                        logger.error(f"Unsupported task type: {task.task_type}")
                        task.status = TaskStatus.FAILED
                        db.commit()
                else:
                    # 3. If NO task found, enter efficient wait state
                    wait_for_notification(db, timeout=POLL_INTERVAL * 6) # Wait up to 30s

        except Exception as e:
            logger.error(f"Critical Worker Loop Error: {e}")
            logger.error(traceback.format_exc())
            time.sleep(5)

    logger.info("Worker shutdown complete.")
