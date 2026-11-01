from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.communication import Announcement, Notification
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.material import AnnouncementSchema, NotificationSchema

router = APIRouter(prefix="/communication", tags=["Communication"])


@router.get("/notifications", response_model=ApiResponse[List[NotificationSchema]])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Notification)
        .where(
            or_(
                Notification.recipient_user_id == current_user.id,
                Notification.recipient_user_id == None,
            )
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    output = [
        NotificationSchema(
            id=n.id,
            title=n.title,
            message=n.message,
            category=n.category,
            read=n.is_read,
            createdAt=str(n.created_at),
            priority=n.priority,
            link=n.link,
        )
        for n in records
    ]
    return ApiResponse(success=True, data=output)


@router.get("/announcements", response_model=ApiResponse[List[AnnouncementSchema]])
async def get_announcements(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Announcement).order_by(Announcement.publish_date.desc()).limit(20)
    result = await db.execute(stmt)
    announcements = result.scalars().all()

    output = [
        AnnouncementSchema(
            id=a.id,
            title=a.title,
            content=a.content,
            priority=a.priority,
            publishedBy="Administration",
            publishedRole="super_admin",
            publishDate=a.publish_date,
            targetAudience=a.target_audience,
            category=a.category,
            attachmentName=a.attachment_name,
        )
        for a in announcements
    ]
    return ApiResponse(success=True, data=output)
