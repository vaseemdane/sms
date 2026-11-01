from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class AttendanceStudentItem(BaseModel):
    studentId: str
    status: str = Field(..., pattern="^(PRESENT|ABSENT|LATE|EXCUSED)$")
    remarks: Optional[str] = None


class AttendanceSaveRequest(BaseModel):
    sectionId: str
    date: str = Field(..., pattern="^\\d{4}-\\d{2}-\\d{2}$")
    records: Dict[str, str]  # studentId -> status (PRESENT/ABSENT/LATE)


class AttendanceMonthlyItem(BaseModel):
    month: str
    percentage: float
    present: int
    absent: int
    late: int
    total: int


class StudentAttendanceSummaryResponse(BaseModel):
    overallPercentage: float
    presentDays: int
    absentDays: int
    lateDays: int
    excusedDays: int
    totalWorkingDays: int
    monthlyBreakdown: List[AttendanceMonthlyItem]
    dayRecords: Dict[str, str]  # YYYY-MM-DD -> status
    isBelowThreshold: bool
    threshold: float = 75.0
