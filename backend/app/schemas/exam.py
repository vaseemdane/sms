from typing import List, Optional
from pydantic import BaseModel, Field


class StudentExamMarkSchema(BaseModel):
    id: str
    studentId: str
    studentName: Optional[str] = None
    rollNo: Optional[str] = None
    academicYear: str
    term: int
    examName: str
    subject: str
    subjectId: str
    testScore: float
    examScore: float
    totalScore: float
    maxScore: float = 100.0
    grade: str
    gradePoint: float
    status: str
    teacherRemark: Optional[str] = None
    publishedAt: Optional[str] = None


class SubmitExamMarksRequest(BaseModel):
    examId: str
    subjectId: str
    sectionId: str
    marks: List[StudentExamMarkSchema]


class StudentReportCardResponse(BaseModel):
    studentId: str
    studentName: str
    admissionNo: str
    rollNo: Optional[str] = None
    className: str
    sectionName: str
    examName: str
    term: int
    academicYear: str
    marks: List[StudentExamMarkSchema]
    totalScore: float
    averageScore: float
    classPosition: Optional[int] = 1
    classSize: Optional[int] = 30
    attendancePercentage: float
    headTeacherRemark: Optional[str] = "Promoted with honors."
    classTeacherRemark: Optional[str] = "Consistently proactive and diligent."
