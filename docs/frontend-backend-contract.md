# Frontend-Backend Contract Specification: EduPulse SMS

## 1. Global Specifications
- **Base URL**: `/api/v1`
- **Standard Request Headers**:
  - `Authorization: Bearer <access_token>`
  - `Content-Type: application/json`
  - `X-Request-ID: <uuidv4>`
- **Standard Success Envelope**:
  ```json
  {
    "success": true,
    "data": {},
    "message": "Optional descriptive success message",
    "meta": {
      "page": 1,
      "page_size": 25,
      "total": 100,
      "total_pages": 4
    }
  }
  ```
- **Standard Error Envelope**:
  ```json
  {
    "success": false,
    "error": {
      "code": "ERROR_CODE_ENUM",
      "message": "Sanitized user-facing message",
      "details": null,
      "request_id": "req-12345"
    }
  }
  ```

---

## 2. API Contract Matrix

| Frontend Screen | Route Path | API Endpoint | Method | Role(s) | Request Schema / Params | Response Schema | Cache / Notes |
|---|---|---|---|---|---|---|---|
| **Login** | `/auth/login` | `/api/v1/auth/login` | POST | Guest | `{ identifier, password, remember_me }` | `{ user, access_token, refresh_token, must_change_password }` | Rate limit 5/min |
| **Refresh Token** | Background | `/api/v1/auth/refresh` | POST | Guest | `{ refresh_token }` | `{ access_token, refresh_token }` | Token rotation |
| **Logout** | Header | `/api/v1/auth/logout` | POST | Authenticated | `{ refresh_token }` | `{ success: true }` | Revoke refresh token |
| **Forgot Password** | `/auth/forgot-password` | `/api/v1/auth/forgot-password` | POST | Guest | `{ email }` | `{ success: true, message }` | Rate limit 3/hr |
| **Reset Password** | `/auth/reset-password` | `/api/v1/auth/reset-password` | POST | Guest | `{ token, new_password }` | `{ success: true }` | Invalidate token |
| **Current User / Profile** | `/settings/profile` | `/api/v1/me` | GET | All | — | `User` entity | Short-lived cache |
| **Update Profile** | `/settings/profile` | `/api/v1/me` | PATCH | All | `{ name, phone, address, blood_group, dob }` | `User` entity | Invalidate user cache |
| **Change Password** | `/settings/profile` | `/api/v1/me/password` | POST | All | `{ current_password, new_password }` | `{ success: true }` | Revoke all sessions |
| **Admin Dashboard KPI** | `/dashboard` | `/api/v1/admin/dashboard/stats` | GET | `super_admin`, `admin` | — | `{ total_students, total_teachers, total_classes, total_sections, attendance_today_pct }` | Cache 60s |
| **Teacher Dashboard** | `/dashboard` | `/api/v1/teacher/dashboard` | GET | `teacher` | — | `{ assigned_sections, assigned_subjects, is_class_teacher, today_schedule, pending_marks }` | Cache 30s |
| **Student Dashboard** | `/dashboard` | `/api/v1/student/dashboard` | GET | `student` | — | `{ profile, attendance_pct, current_term, upcoming_exams, unread_notifications }` | Cache 30s |
| **Parent Dashboard** | `/dashboard` | `/api/v1/parent/dashboard` | GET | `parent` | — | `{ wards: [{ id, name, class_name, attendance_pct, fee_due }] }` | Cache 30s |
| **User Directory** | `/users` | `/api/v1/admin/users` | GET | `super_admin`, `admin` | `?page=1&page_size=25&role=teacher&search=xyz` | `PaginatedResponse<User>` | Indexed search |
| **Create Staff User** | `/users` | `/api/v1/admin/users` | POST | `super_admin`, `admin` | `{ name, email, username, user_type, phone, gender, state, district }` | `User` entity | Creates temp password |
| **Classes & Sections** | `/academics/classes` | `/api/v1/academics/classes` | GET | All | — | `Class[]` with nested `Section[]` | Cache 1 hr |
| **Create Class** | `/academics/classes` | `/api/v1/academics/classes` | POST | `super_admin`, `admin` | `{ name, class_type_id }` | `Class` entity | Invalidate cache |
| **Create Section** | `/academics/classes` | `/api/v1/academics/sections` | POST | `super_admin`, `admin` | `{ class_id, name, code }` | `Section` entity | Invalidate cache |
| **Assign Class Teacher** | `/academics/classes` | `/api/v1/admin/assignments/class-teacher` | POST | `super_admin`, `admin` | `{ section_id, teacher_id, academic_year_id }` | `{ success: true }` | 1:1 validation, invalidate cache |
| **Assign Subject Teacher** | `/academics/subjects` | `/api/v1/admin/assignments/subject-teacher` | POST | `super_admin`, `admin` | `{ section_id, teacher_id, subject_id, academic_year_id }` | `{ success: true }` | Invalidate cache |
| **Student Admission** | `/students/new` | `/api/v1/admin/students` | POST | `super_admin`, `admin` | `{ first_name, last_name, dob, gender, state, district, class_id, section_id, adm_no, parent_id, dorm_id }` | `StudentRecord` entity | Atomic transaction |
| **Cohort Students** | `/classes/[id]/students` | `/api/v1/academics/sections/{id}/students` | GET | `super_admin`, `admin`, `teacher` (assigned) | `?page=1&page_size=50` | `PaginatedResponse<StudentProfile>` | Auth verified |
| **Mark Class Attendance** | `/teacher/attendance` | `/api/v1/attendance/sections/{section_id}` | POST | `teacher` (Class Teacher only) | `{ date, records: [{ student_id, status, remarks }] }` | `{ recorded_count: int }` | Server checks Class Teacher status |
| **Get Section Attendance** | `/teacher/attendance` | `/api/v1/attendance/sections/{section_id}` | GET | `teacher`, `admin` | `?date=YYYY-MM-DD` | `Record<student_id, AttendanceStatus>` | Auth verified |
| **Student Attendance** | `/student/attendance` | `/api/v1/student/attendance` | GET | `student` (self), `parent` (ward) | `?academic_year_id=xyz` | `StudentAttendanceSummary` | Identity strictly from token |
| **Timetable (Master/Section)** | `/academics/timetables` | `/api/v1/timetables/sections/{id}` | GET | All | — | `SectionTimetable` | Cache 24 hr |
| **Save Timetable Day** | `/academics/timetables` | `/api/v1/timetables/sections/{id}/schedule` | PUT | `super_admin`, `admin` | `{ day, slots: [CustomTimeSlot] }` | `SectionTimetable` | Collision detection check |
| **Publish Timetable** | `/academics/timetables` | `/api/v1/timetables/sections/{id}/publish` | POST | `super_admin`, `admin` | `{ is_published: boolean }` | `{ success: true }` | Invalidate timetable cache |
| **Teacher Timetable** | `/teacher/timetable` | `/api/v1/teacher/timetable` | GET | `teacher` | — | `TeacherWeeklySchedule` | Filtered to own teacher_id |
| **Student Timetable** | `/student/timetable` | `/api/v1/student/timetable` | GET | `student` | — | `SectionTimetable` | Derived from student enrollment |
| **Upload Study Material** | `/teacher/materials` | `/api/v1/materials` | POST | `teacher` (assigned to target sections) | Multipart: `{ title, description, subject_id, target_section_ids, file }` | `StudyMaterial` entity | Validates teacher assignment |
| **Get Student Materials** | `/student/academics/materials` | `/api/v1/student/materials` | GET | `student` | `?page=1&page_size=20` | `PaginatedResponse<StudyMaterial>` | Filtered to student section |
| **Create Assignment** | `/teacher/assignments` | `/api/v1/assignments` | POST | `teacher` | Multipart: `{ title, description, subject_id, target_section_ids, due_date, total_marks, file? }` | `Assignment` entity | Assignment-checked |
| **Submit Assignment** | `/student/academics/assignments` | `/api/v1/assignments/{id}/submit` | POST | `student` | Multipart: `{ file }` | `AssignmentSubmission` entity | Due-date validated |
| **Submit Exam Marks** | `/teacher/marks` | `/api/v1/examinations/marks` | POST | `teacher` (Subject Teacher or Class Teacher) | `{ exam_id, subject_id, section_id, marks: [{ student_id, test_score, exam_score, teacher_remark }] }` | `{ success: true, count: int }` | Validates subject assignment |
| **Student Report Card** | `/student/academics/report-card` | `/api/v1/student/report-card` | GET | `student`, `parent` | `?exam_id=xyz` | `StudentReportCard` | Validates exam publication status |
| **Notifications List** | `/student/notifications` | `/api/v1/notifications` | GET | Authenticated | `?page=1&unread_only=false` | `PaginatedResponse<Notification>` | Targeted to user |
| **Audit Logs** | `/teacher/audit`, `/admin/audit`| `/api/v1/audit-logs` | GET | `super_admin`, `admin`, `teacher` (own) | `?page=1&action=xyz` | `PaginatedResponse<AuditLog>` | Append-only store |
