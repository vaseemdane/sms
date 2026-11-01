from typing import List, Optional
from pydantic import BaseModel, Field


class StudyMaterialSchema(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    subject: str
    subjectId: str
    teacherId: str
    teacherName: str
    targetSectionIds: List[str]
    targetSectionCodes: List[str]
    fileName: str
    fileSize: str
    fileType: str
    academicYear: str
    createdAt: str
    downloadUrl: Optional[str] = None


class StudyMaterialCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    subjectId: str
    targetSectionIds: List[str]


class AssignmentSchema(BaseModel):
    id: str
    title: str
    description: str
    subject: str
    subjectId: str
    teacherId: str
    teacherName: str
    targetSectionIds: List[str]
    targetSectionCodes: List[str]
    dueDate: str
    totalMarks: float
    academicYear: str
    createdAt: str
    attachmentName: Optional[str] = None


class AssignmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str
    subjectId: str
    targetSectionIds: List[str]
    dueDate: str
    totalMarks: float = 100.0


class AssignmentSubmissionSchema(BaseModel):
    id: str
    assignmentId: str
    studentId: str
    studentName: str
    sectionId: str
    sectionCode: str
    submittedAt: Optional[str] = None
    status: str
    obtainedMarks: Optional[float] = None
    feedback: Optional[str] = None


class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    category: str
    read: bool
    createdAt: str
    priority: Optional[str] = "normal"
    link: Optional[str] = None


class AnnouncementSchema(BaseModel):
    id: str
    title: str
    content: str
    priority: str
    publishedBy: str
    publishedRole: str
    publishDate: str
    targetAudience: str
    category: str
    attachmentName: Optional[str] = None


class AuditLogSchema(BaseModel):
    id: str
    teacherId: str
    teacherName: str
    action: str
    targetType: str
    targetId: Optional[str] = None
    details: str
    timestamp: str
