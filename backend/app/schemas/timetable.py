from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class CustomTimeSlotSchema(BaseModel):
    id: str
    startTime: str = Field(..., pattern="^\\d{2}:\\d{2}$")
    endTime: str = Field(..., pattern="^\\d{2}:\\d{2}$")
    type: str = Field(..., pattern="^(PERIOD|BREAK)$")
    title: Optional[str] = None
    subject: Optional[str] = None
    subjectId: Optional[str] = None
    teacherId: Optional[str] = None
    teacherName: Optional[str] = None
    room: Optional[str] = None


class SectionTimetableResponse(BaseModel):
    sectionId: str
    sectionName: str
    isPublished: bool
    schedule: Dict[str, List[CustomTimeSlotSchema]]  # Monday, Tuesday, ...


class SaveTimetableDayRequest(BaseModel):
    day: str = Field(..., pattern="^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$")
    slots: List[CustomTimeSlotSchema]


class CheckTeacherConflictRequest(BaseModel):
    sectionId: str
    day: str
    startTime: str
    endTime: str
    teacherId: str


class ConflictCheckResponse(BaseModel):
    hasConflict: bool
    conflictingClass: Optional[str] = None
    conflictingTime: Optional[str] = None
