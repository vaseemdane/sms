# Database Relationships & Domain Architecture

```mermaid
erDiagram
    School ||--o{ User : "belongs_to"
    School ||--o{ Class : "defines"
    Class ||--o{ Section : "contains"
    AcademicYear ||--o{ StudentEnrollment : "scopes"
    AcademicYear ||--o{ TeacherAssignment : "scopes"
    AcademicYear ||--o{ Exam : "schedules"

    User ||--o| StudentProfile : "has_profile"
    User ||--o| TeacherProfile : "has_profile"
    User ||--o{ ParentChildLink : "parent_of"

    StudentProfile ||--o{ StudentEnrollment : "enrolled_in"
    StudentProfile ||--o{ ParentChildLink : "linked_to"
    StudentProfile ||--o{ StudentAttendanceRecord : "has_attendance"
    StudentProfile ||--o{ ExamMark : "receives_marks"
    StudentProfile ||--o{ AssignmentSubmission : "submits_work"

    TeacherProfile ||--o{ TeacherAssignment : "instructs"
    TeacherProfile ||--o{ Assignment : "authors"
    TeacherProfile ||--o{ StudyMaterial : "uploads"

    Section ||--o{ StudentEnrollment : "enrolled_cohort"
    Section ||--o{ TeacherAssignment : "assigned_teachers"
    Section ||--o{ AttendanceSession : "conducts_sessions"
    Section ||--o{ TimetableSlot : "bell_schedule"
    Section ||--o{ AssignmentTarget : "targeted_cohort"
    Section ||--o{ StudyMaterialTarget : "targeted_cohort"

    Subject ||--o{ TeacherAssignment : "curriculum"
    Subject ||--o{ ExamMark : "graded_in"
    Subject ||--o{ Assignment : "curriculum"

    Exam ||--o{ ExamMark : "records"
    GradeScale ||--o{ ExamMark : "classifies"

    Assignment ||--o{ AssignmentTarget : "targets"
    Assignment ||--o{ AssignmentSubmission : "receives"

    AttendanceSession ||--o{ StudentAttendanceRecord : "contains_records"
    AttendanceSession ||--o{ AttendanceAuditLog : "audits"
```

## Key Relational Integrity Constraints
1. **Teacher Assignment Partial Unique Index** (`teacher.py`):
   - `uq_section_class_teacher_per_year`: Exactly **one** primary Class Teacher is permitted per section per academic year.
2. **Student Annual Enrollment Constraint** (`student.py`):
   - `uq_student_enrollment_per_year`: A student can belong to only **one** class/section in an academic year.
3. **Parent–Child Link Constraint** (`student.py`):
   - `uq_parent_student_link`: Prevents duplicate relational mappings between the same parent user and student profile.
4. **Attendance Session Uniqueness** (`attendance.py`):
   - `uq_attendance_session_section_date`: Exactly one attendance session per section per instructional date.
5. **Exam Marks Uniqueness** (`exam.py`):
   - `(exam_id, student_id, subject_id)`: Uniquely identifies a student's score for a subject within an exam cycle.
