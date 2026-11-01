from typing import Any, List, Optional
from pydantic import BaseModel, EmailStr, Field, model_validator


class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=2, max_length=128)  # email, username, phone, or admission no
    password: str = Field(..., min_length=4, max_length=128)  # DDMMYYYY is 8 chars, passwords >= 4
    remember_me: bool = False


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., min_length=10)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=8)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=10)
    new_password: str = Field(..., min_length=8)


class UserSummary(BaseModel):
    id: str
    name: str
    email: str
    username: str
    userType: str  # Frontend uses camelCase 'userType'
    school_id: Optional[str] = None
    schoolId: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    dob: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    address: Optional[str] = None
    photo_url: Optional[str] = None
    photo: Optional[str] = None
    code: Optional[str] = None
    subjectSpecialization: Optional[str] = None
    qualification: Optional[str] = None
    assignedClassTeacher: Optional[str] = None
    assignedSubjects: Optional[List[str]] = None
    createdAt: Optional[str] = None
    mustChangePassword: bool = False
    active: bool = True

    model_config = {"from_attributes": True}


class AuthResponseData(BaseModel):
    user: UserSummary
    token: str  # Access token
    role: str  # SUPER_ADMIN, PRINCIPAL, TEACHER, STUDENT
    refreshToken: str
    expiresAt: int  # Timestamp in ms for frontend compatibility
    mustChangePassword: bool
    user_id: Optional[str] = None
    school_id: Optional[str] = None
    is_first_login: Optional[bool] = False


# Hierarchical Provisioning Schemas
class CreatePrincipalRequest(BaseModel):
    school_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    username: Optional[str] = None
    phone: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)


class PrincipalHandoverRequest(BaseModel):
    existing_principal_id: Optional[str] = None
    school_id: Optional[str] = Field("sch-main", min_length=1)
    name: Optional[str] = None
    successor_name: Optional[str] = None
    email: Optional[EmailStr] = None
    successor_email: Optional[EmailStr] = None
    username: Optional[str] = None
    successor_username: Optional[str] = None
    phone: Optional[str] = None
    successor_phone: Optional[str] = None
    password: Optional[str] = None
    successor_password: Optional[str] = None
    handover_reason: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_successor_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("name") and data.get("successor_name"):
                data["name"] = data["successor_name"]
            elif not data.get("successor_name") and data.get("name"):
                data["successor_name"] = data["name"]

            if not data.get("email") and data.get("successor_email"):
                data["email"] = data["successor_email"]
            elif not data.get("successor_email") and data.get("email"):
                data["successor_email"] = data["email"]

            if not data.get("password") and data.get("successor_password"):
                data["password"] = data["successor_password"]
            elif not data.get("successor_password") and data.get("password"):
                data["successor_password"] = data["password"]

            if not data.get("username") and data.get("successor_username"):
                data["username"] = data["successor_username"]
            elif not data.get("successor_username") and data.get("username"):
                data["successor_username"] = data["username"]

            if not data.get("phone") and data.get("successor_phone"):
                data["phone"] = data["successor_phone"]
            elif not data.get("successor_phone") and data.get("phone"):
                data["successor_phone"] = data["phone"]
        return data


class PrincipalUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None


class PrincipalResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=6, max_length=128)



class CreateTeacherRequest(BaseModel):
    school_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=2, max_length=128)
    email: EmailStr
    username: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = "General"
    state: Optional[str] = "Karnataka"
    district: Optional[str] = "Bengaluru Urban"


class CreateStudentRequest(BaseModel):
    school_id: Optional[str] = "sch-default"
    name: str = Field(..., min_length=2, max_length=128)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    date_of_birth: str = Field(..., min_length=8, max_length=32)  # DD-MM-YYYY, YYYY-MM-DD, or DDMMYYYY
    email: Optional[EmailStr] = None
    gender: Optional[str] = "male"
    academic_year_id: Optional[str] = None
    class_id: Optional[str] = None
    stream_id: Optional[str] = None
    section_id: Optional[str] = None
    admission_number: Optional[str] = None
    state: Optional[str] = "Karnataka"
    district: Optional[str] = "Bengaluru Urban"
    address: Optional[str] = None
    parent_name: Optional[str] = None
    parent_phone: Optional[str] = None
    photo_url: Optional[str] = None
    dorm_id: Optional[str] = None
    dorm_room_no: Optional[str] = None


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    gender: Optional[str] = None
    bloodGroup: Optional[str] = None
    dob: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    photo_url: Optional[str] = None
    photo: Optional[str] = None

