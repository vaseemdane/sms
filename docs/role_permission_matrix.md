# Role-Permission Matrix (5 School Roles & API Boundaries)

## 1. Role Scope & Operational Boundaries

| Role | Scope / Identity | Primary Responsibilities | Strict Access Restrictions |
| :--- | :--- | :--- | :--- |
| **School Admin** (`super_admin` / `admin`) | School Operational Authority & Identity Governance | User provisioning, class/section setup, staff assignment, admission configuration, fee structures, audit review. | Cannot modify published examination marks directly; cannot act as class teacher without assignment; cannot reverse financial audits without trace. |
| **Principal** (`principal`) | Whole-School Academic Executive & Oversight | Timetable compilation/approval, attendance locks & exception overrides, grade moderation, report card publication, teacher evaluations. | No fee structure mutation; no platform-level user deletion; cannot mark daily section attendance unless assigned. |
| **Teacher** (`teacher`) | Section / Subject Instructional Scope | Daily section attendance (Class Teacher only), homework/assignment management, study material publishing, exam marks entry for assigned subjects. | Strict 403 on unassigned sections or unassigned subjects; cannot publish whole-school report cards; cannot edit attendance after 48-hour lock without Principal unlock. |
| **Student** (`student`) | Own Profile & Enrolled Section | Viewing personal attendance, assignments, study materials, published report cards, timetable, and school announcements; submitting homework. | Strict 403 on other students' data (BOLA protection); no access to unpublished exam marks or draft timetables; no administrative actions. |
| **Parent / Guardian** (`parent`) | Linked & Verified Wards Only (`ParentChildLink`) | Viewing linked ward's attendance, timetable, fee dues, report cards; digital field trip consents; PTA RSVPs; fee payment. | Strict 403 on unlinked children; cannot view draft grades; cannot edit attendance or marks; URL parameter tampering blocked at API boundary. |

---

## 2. API Endpoint Access Matrix

| Endpoint | HTTP Method | School Admin | Principal | Teacher | Student | Parent | Authorization Check / Dependency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| `/api/v1/admin/dashboard/stats` | `GET` | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["super_admin", "admin"])` |
| `/api/v1/admin/users` | `GET`, `POST` | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["super_admin", "admin"])` |
| `/api/v1/principal/dashboard-stats` | `GET` | ✅ Allow | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["principal", "super_admin", "admin"])` |
| `/api/v1/principal/attendance-analytics` | `GET` | ✅ Allow | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["principal", "super_admin", "admin"])` |
| `/api/v1/attendance/sections/{id}` | `POST` | ✅ Allow | ❌ Deny | ⚡ Class Teacher Only | ❌ Deny | ❌ Deny | `TeacherAssignment.assignment_type == "CLASS_TEACHER"` |
| `/api/v1/attendance/sessions/{id}/unlock` | `POST` | ✅ Allow | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | Principal override with `AttendanceAuditLog` |
| `/api/v1/attendance/student` | `GET` | ✅ Allow | ✅ Allow | ✅ Allow | 🔒 Self Only | 🔒 Verified Wards Only | `ParentChildLink` check for parents (`403` on unlinked) |
| `/api/v1/materials/assignments` | `POST` | ✅ Allow | ❌ Deny | ⚡ Assigned Subj/Sec | ❌ Deny | ❌ Deny | `TeacherAssignment` scope check |
| `/api/v1/materials/assignments/section/{id}`| `GET` | ✅ Allow | ✅ Allow | ✅ Allow | 🔒 Enrolled Sec | 🔒 Ward's Sec | Section scope check |
| `/api/v1/materials/assignments/{id}/submissions` | `POST` | ❌ Deny | ❌ Deny | ❌ Deny | ✅ Enrolled Student | ❌ Deny | Student Profile check |
| `/api/v1/materials/assignments/{id}/submissions/{sub_id}/grade` | `PATCH` | ✅ Allow | ❌ Deny | ⚡ Assigned Teacher | ❌ Deny | ❌ Deny | Subject Teacher check |
| `/api/v1/examinations/marks` | `POST` | ✅ Allow | ❌ Deny | ⚡ Assigned Subj/Sec | ❌ Deny | ❌ Deny | Boundary check `[0, 100]`, lock check if `PUBLISHED` |
| `/api/v1/examinations/{id}/moderate` | `POST` | ❌ Denied (Super Admin Only) | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["principal", "super_admin"])` |
| `/api/v1/examinations/{id}/publish-results` | `POST` | ❌ Denied (Super Admin Only) | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["principal", "super_admin"])` |
| `/api/v1/students/report-card` | `GET` | ✅ Allow | ✅ Allow | ✅ Allow | 🔒 Self (Published Only) | 🔒 Ward (Published Only) | `Exam.is_published == True` & `ExamMark.status == "PUBLISHED"` |
| `/api/v1/parent/wards` | `GET` | ✅ Allow | ❌ Deny | ❌ Deny | ❌ Deny | 🔒 Self Wards | `ParentChildLink.parent_user_id == current_user.id` |
| `/api/v1/operations/field-trips/{id}/consent` | `POST` | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | 🔒 Ward Only | `ParentChildLink` check (`403` on forged student ID) |
| `/api/v1/operations/pta-meetings/{id}/rsvp` | `POST` | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | 🔒 Ward Only | `ParentChildLink` check (`403` on forged student ID) |
| `/api/v1/super-admin/roles` | `GET`, `POST` | 🔒 Super Admin | ❌ Deny | ❌ Deny | ❌ Deny | ❌ Deny | `RoleChecker(["super_admin"])` |
