from typing import List, Optional
from pydantic import BaseModel, Field


class AcademicYearSchema(BaseModel):
    id: str
    name: str
    code: str
    startDate: str
    endDate: str
    isCurrent: bool
    isActive: bool = True
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class AcademicYearCreateRequest(BaseModel):
    name: str = Field(..., min_length=4, max_length=64)  # "2027-2028"
    code: str = Field(..., min_length=2, max_length=32)  # "2027-28"
    startDate: str = Field(..., min_length=8, max_length=16)  # "2027-06-01"
    endDate: str = Field(..., min_length=8, max_length=16)    # "2028-04-30"
    isCurrent: bool = False
    description: Optional[str] = None


class AcademicYearUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None


class StreamSchema(BaseModel):
    id: str
    name: str
    code: str
    description: Optional[str] = None
    isActive: bool = True

    model_config = {"from_attributes": True}


class StreamCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=64)  # "Science", "Commerce", "Arts"
    code: str = Field(..., min_length=2, max_length=16)  # "SCI", "COMM", "ARTS"
    description: Optional[str] = None


class StreamUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    isActive: Optional[bool] = None


class SectionSchema(BaseModel):
    id: str
    classId: str
    streamId: Optional[str] = None
    streamName: Optional[str] = None
    name: str
    code: str
    capacity: int = 40
    roomNumber: Optional[str] = None
    isActive: bool = True
    classTeacherId: Optional[str] = None
    classTeacherName: Optional[str] = None
    studentsCount: Optional[int] = 0

    model_config = {"from_attributes": True}


class SectionCreateRequest(BaseModel):
    classId: str
    streamId: Optional[str] = None
    name: str = Field(..., min_length=1, max_length=64)
    code: str = Field(..., min_length=1, max_length=16)
    capacity: Optional[int] = 40
    roomNumber: Optional[str] = None


class SectionUpdateRequest(BaseModel):
    streamId: Optional[str] = None
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    roomNumber: Optional[str] = None
    room_no: Optional[str] = None
    isActive: Optional[bool] = None


class ClassSchema(BaseModel):
    id: str
    name: str
    classTypeId: str
    orderIndex: int = 0
    hasStreams: bool = False
    isActive: bool = True
    sections: List[SectionSchema] = []
    sectionsCount: Optional[int] = 0
    studentsCount: Optional[int] = 0

    model_config = {"from_attributes": True}


class ClassCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=64)
    classTypeId: Optional[str] = "ct-secondary"
    orderIndex: Optional[int] = 0
    hasStreams: bool = False


class ClassUpdateRequest(BaseModel):
    name: Optional[str] = None
    orderIndex: Optional[int] = None
    hasStreams: Optional[bool] = None
    isActive: Optional[bool] = None


class SubjectSchema(BaseModel):
    id: str
    classId: str
    name: str
    slug: str
    code: Optional[str] = None
    isCore: bool = True
    assignedTeacherId: Optional[str] = None
    assignedTeacherName: Optional[str] = None

    model_config = {"from_attributes": True}


class SubjectCreateRequest(BaseModel):
    classId: str
    name: str = Field(..., min_length=2, max_length=128)
    slug: Optional[str] = None
    code: Optional[str] = None
    isCore: bool = True


class SubjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    code: Optional[str] = None
    isCore: Optional[bool] = None


class AssignClassTeacherRequest(BaseModel):
    sectionId: str
    teacherId: str
    academicYearId: Optional[str] = None


class AssignSubjectTeacherRequest(BaseModel):
    sectionId: str
    teacherId: str
    subjectId: str
    academicYearId: Optional[str] = None


class EnrollmentCreateRequest(BaseModel):
    studentId: str  # student_profile.id or user_id
    academicYearId: str
    classId: str
    streamId: Optional[str] = None
    sectionId: str
    rollNumber: Optional[str] = None


class EnrollmentSchema(BaseModel):
    id: str
    studentId: str
    studentName: str
    admissionNumber: str
    academicYearId: str
    academicYearName: str
    classId: str
    className: str
    streamId: Optional[str] = None
    streamName: Optional[str] = None
    sectionId: str
    sectionCode: str
    rollNumber: Optional[str] = None
    status: str

    # Complete Student Registration Details
    dob: Optional[str] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    parentName: Optional[str] = None
    parentPhone: Optional[str] = None
    parentEmail: Optional[str] = None
    dormId: Optional[str] = None
    dormRoomNo: Optional[str] = None

    model_config = {"from_attributes": True}


class RecalculateRollNumbersRequest(BaseModel):
    sectionId: str
    academicYearId: str
