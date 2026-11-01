# API Integration Map: Frontend Components to Backend Endpoints

| Frontend Route / Component | Primary Backend Endpoint | HTTP Method | Request Payload / Params | Response Data Model | Primary Roles |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `app/(app)/dashboard/page.tsx` | `/api/v1/admin/dashboard/stats` | `GET` | — | `totalStudents`, `totalTeachers`, `totalClasses`, `attendanceAverage` | Admin, Super Admin |
| `components/dashboard/principal-dashboard.tsx` | `/api/v1/principal/dashboard-stats` | `GET` | — | `totalStudents`, `attendance`, `upcomingExaminations`, `publishedMarks` | Principal |
| `components/dashboard/principal-dashboard.tsx` | `/api/v1/principal/attendance-analytics` | `GET` | `date: string`, `class_id?: string` | `classAttendance[]`, `schoolAttendanceRate` | Principal |
| `components/dashboard/principal-dashboard.tsx` | `/api/v1/principal/performance-analytics` | `GET` | `exam_id?: string` | `topPerformers[]`, `subjectPerformance[]` | Principal |
| `components/dashboard/parent-dashboard.tsx` | `/api/v1/parent/wards` | `GET` | — | `wards[]`: `name`, `admissionNo`, `className`, `sectionName`, `feeDue` | Parent |
| `app/(app)/student/attendance/page.tsx` | `/api/v1/attendance/student` | `GET` | `student_id?: string` | `StudentAttendanceSummaryResponse`: `overallPercentage`, `dayRecords` | Student, Parent (Ward) |
| `app/(app)/student/academics/report-card/page.tsx` | `/api/v1/students/report-card` | `GET` | `exam_id: string`, `student_id?: string` | `StudentReportCardResponse`: `marks[]`, `totalScore`, `averageScore` | Student, Parent (Ward) |
| `app/(app)/student/academics/materials/page.tsx` | `/api/v1/materials/section/{section_id}` | `GET` | `section_id: string` | `StudyMaterialSchema[]`: `title`, `subject`, `fileName`, `downloadUrl` | Student, Parent |
| `app/(app)/student/academics/assignments/page.tsx` | `/api/v1/materials/assignments/section/{section_id}` | `GET` | `section_id: string` | `AssignmentSchema[]`: `title`, `dueDate`, `totalMarks`, `teacherName` | Student, Parent |
| `app/(app)/student/academics/assignments/page.tsx` | `/api/v1/materials/assignments/{id}/submissions` | `POST` | Empty (or file upload) | `AssignmentSubmissionSchema`: `id`, `status: "SUBMITTED"`, `submittedAt` | Student |
| `app/(app)/teacher/attendance/page.tsx` | `/api/v1/attendance/sections/{section_id}` | `POST` | `AttendanceSaveRequest`: `date`, `records: { studentId: status }` | `recordedCount: number` | Teacher (Class Teacher) |
| `app/(app)/teacher/marks/page.tsx` | `/api/v1/examinations/marks` | `POST` | `SubmitExamMarksRequest`: `examId`, `sectionId`, `subjectId`, `marks[]` | `submittedCount: number` | Teacher (Subject Teacher) |
| `app/(app)/teacher/materials/page.tsx` | `/api/v1/materials` | `POST` | `FormData`: `title`, `subjectId`, `targetSectionIds`, `file` | `StudyMaterialSchema` | Teacher |
| `app/(app)/teacher/assignments/page.tsx` | `/api/v1/materials/assignments` | `POST` | `AssignmentCreateRequest`: `title`, `subjectId`, `dueDate`, `totalMarks` | `AssignmentSchema` | Teacher |
| `components/dashboard/parent-dashboard.tsx` | `/api/v1/operations/field-trips/{trip_id}/consent` | `POST` | `FieldTripConsentSubmit`: `signature`, `emergencyPhone`, `medicalNotes` | `id: string`, `message` | Parent (Ward Only) |
| `components/dashboard/parent-dashboard.tsx` | `/api/v1/operations/pta-meetings/{id}/rsvp` | `POST` | `PTARsvpSubmit`: `student_id`, `rsvp_status`, `notes` | `id: string`, `message` | Parent (Ward Only) |
