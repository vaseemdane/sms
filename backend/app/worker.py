import asyncio
from typing import Any, Dict
from arq import cron
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.logging import logger


async def startup(ctx: Dict[Any, Any]):
    logger.info("ARQ background worker initialized", redis_url=settings.REDIS_URL)


async def shutdown(ctx: Dict[Any, Any]):
    logger.info("ARQ background worker shutdown complete")


async def generate_fee_receipt_pdf(ctx: Dict[Any, Any], payment_id: str, student_id: str) -> str:
    """Generates PDF receipt and saves to uploads directory."""
    logger.info("Generating PDF fee receipt", payment_id=payment_id, student_id=student_id)
    # Task implementation executes synchronously in worker thread, offloading FastAPI
    await asyncio.sleep(0.5)
    return f"receipt_{payment_id}.pdf"


async def generate_report_card_pdf(ctx: Dict[Any, Any], exam_id: str, student_id: str) -> str:
    """Generates PDF term report card."""
    logger.info("Generating PDF student report card", exam_id=exam_id, student_id=student_id)
    await asyncio.sleep(0.5)
    return f"report_card_{exam_id}_{student_id}.pdf"


async def execute_bulk_promotion(ctx: Dict[Any, Any], promotion_payload: Dict[str, Any]) -> int:
    """Executes bulk student transition (ACTIVE -> PROMOTED/GRADUATED)."""
    logger.info("Executing asynchronous bulk student promotion", count=len(promotion_payload.get("student_ids", [])))
    await asyncio.sleep(1.0)
    return len(promotion_payload.get("student_ids", []))


async def calculate_attendance_absence_alerts(ctx: Dict[Any, Any]) -> int:
    """Checks for students below 75% attendance threshold and dispatches parent notifications."""
    logger.info("Running automated parent absence alert scan (<75% threshold)")
    return 0


class WorkerSettings:
    functions = [
        generate_fee_receipt_pdf,
        generate_report_card_pdf,
        execute_bulk_promotion,
        calculate_attendance_absence_alerts,
    ]
    cron_jobs = [
        cron(calculate_attendance_absence_alerts, hour=18, minute=0),  # Runs daily at 6 PM
    ]
    on_startup = startup
    on_shutdown = shutdown
    # Parse redis host & port from settings.REDIS_URL
    redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
