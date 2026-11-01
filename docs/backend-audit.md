# Comprehensive Backend Audit Report: EduPulse School Management System

## 1. Existing Frontend Architecture
- **Framework**: Next.js 16.4.2 (App Router, Turbopack, React 19.3.0, TypeScript 5.0).
- **Styling**: Tailwind CSS v4, Lucide React icons, Radix UI primitives.
- **Client State**:
  - `src/context/sms-store.tsx` (2,861 lines): Monolithic client state machine persisting into `localStorage` (`edupulse_sms_store_v3`). Handles all state, CRUD, validation, conflict detection, and historical generation in-browser.
  - `src/services/auth-context.tsx` & `src/services/auth-service.ts`: Client auth provider persisting into `localStorage` (`edupulse_sms_session_v1`) and cookie (`edupulse_auth_token`).
- **Component Architecture**:
  - Layout: `AppShell`, `Sidebar`, `Topbar`, `RoleSwitcher`.
  - Roles supported: `super_admin`, `admin`, `teacher`, `student`, `parent`, `accountant`.
  - Portals: Dedicated routes for Admin, Teacher Desk, Student Portal, Parent Portal, Academics, Finance, Exams.

## 2. Existing Backend Architecture
- **Current State**: Non-existent standalone backend.
- **Stubbed Routes**: Minimal Next.js API Route Handlers in `src/app/api/v1/`:
  - `src/app/api/v1/student/attendance/route.ts`
  - `src/app/api/v1/student/me/route.ts`
  - `src/app/api/v1/student/performance/route.ts`
  - `src/app/api/v1/teacher/attendance/route.ts`
  - `src/app/api/v1/teacher/materials/route.ts`
- **Authentication**: Pseudo-JWT string `sms_jwt_${userId}_${timestamp}` checked in `src/lib/api-auth.ts`. No cryptographic signing, no key derivation, no DB verification.

## 3. Existing Database
- **Current State**: Client-side in-memory + `localStorage` JSON serialized mock database.
- **Legacy Baseline**: `docs/04_DATABASE_SCHEMA.md` documents 28 legacy MySQL tables from precursor PHP system.
- **Target Backend Database**: PostgreSQL 16 relational database with SQLAlchemy 2.0 (AsyncIO) + Alembic migrations.

## 4. Existing Mock APIs / Data
- `src/mocks/users.ts`: Hardcoded mock users (Super Admin, Admins, Teachers, Students, Parents, Accountants).
- `src/mocks/academics.ts`: Classes (Class 1-12), Class Types, Sections (9A, 9B, 10A-10D), Subjects, Grades (A1-E).
- `src/mocks/exams-and-fees.ts`: Terms, Fee Structures, Receipts, Scratch PINs.
- `src/mocks/indian-geo.ts`: Indian States & Districts (Karnataka localization).
- `src/mocks/auth-users.ts`: Hardcoded dev credentials (`admin@123`, `teacher@123`, `student@123`).

## 5. Required Entities (PostgreSQL Domain Model)
1. `User`: Common identity (id, email, username, password_hash, user_type, is_active, must_change_password, phone, avatar_key, blood_group, dob, gender, state, district, address, created_at, updated_at).
2. `RefreshToken`: Cryptographic refresh tokens (token_hash, user_id, revoked, expires_at, created_at).
3. `AcademicYear`: Academic calendar years (id, name, code, start_date, end_date, is_current).
4. `ClassType`: Educational stages (NURSERY, PRIMARY, SECONDARY, HIGHER_SECONDARY).
5. `Class`: Grade/Class definitions (id, name, class_type_id, order_index).
6. `Section`: Class arms (id, class_id, name, code, is_active).
7. `Subject`: Academic courses (id, name, code, class_id, is_core).
8. `TeacherProfile`: Teacher metadata (user_id, employee_code, specialization, qualification, joining_date).
9. `TeacherAssignment`: Assignment model supporting many-to-many (id, teacher_id, academic_year_id, class_id, section_id, subject_id, assignment_type [CLASS_TEACHER, SUBJECT_TEACHER], is_primary).
10. `StudentProfile`: Student metadata (user_id, admission_number, roll_number, sats_id, current_academic_year_id, parent_id, dorm_id, dorm_room_no, is_graduated, graduated_at).
11. `StudentEnrollment`: Historical yearly cohort tracking (id, student_id, academic_year_id, class_id, section_id, roll_number, status [ACTIVE, PROMOTED, RETAINED, GRADUATED, TRANSFERRED]).
12. `Attendance`: Daily attendance records (id, student_id, academic_year_id, class_id, section_id, date, status [PRESENT, ABSENT, LATE, EXCUSED], recorded_by_user_id, remarks).
13. `Timetable`: Published timetable header (id, academic_year_id, class_id, section_id, is_published, version).
14. `TimetableSlot`: Individual schedule cells (id, timetable_id, day_of_week [Monday-Saturday], start_time, end_time, slot_type [PERIOD, BREAK], title, subject_id, teacher_id, room).
15. `Exam`: Examination cycles (id, academic_year_id, name, term [1, 2, 3], start_date, end_date, is_published).
16. `GradeScale`: Grade definitions (id, class_type_id, name, mark_from, mark_to, grade_point, remark).
17. `ExamMark`: Student exam scores (id, exam_id, student_id, subject_id, class_id, section_id, test_score, exam_score, total_score, grade_id, teacher_remark, submitted_by_user_id, status [DRAFT, SUBMITTED, PUBLISHED]).
18. `StudyMaterial`: Digital courseware (id, academic_year_id, teacher_id, subject_id, title, description, storage_key, file_name, file_size, mime_type, created_at).
19. `StudyMaterialTarget`: Targeted section distribution (material_id, section_id).
20. `Assignment`: Homework and assignments (id, academic_year_id, teacher_id, subject_id, title, description, due_date, total_marks, storage_key, file_name, created_at).
21. `AssignmentTarget`: Section targets (assignment_id, section_id).
22. `AssignmentSubmission`: Student homework submissions (id, assignment_id, student_id, storage_key, file_name, status [PENDING, SUBMITTED, LATE, GRADED], obtained_marks, feedback, submitted_at, graded_by_user_id).
23. `ParentChildLink`: Parent to student relationship mapping (parent_user_id, student_user_id, relationship_type, is_primary_contact).
24. `FeeCategory`: Fee types (Tuition, Transport, Lab, Admission).
25. `FeeStructure`: Class-level fee allocations (id, academic_year_id, class_id, fee_category_id, amount, term, due_date).
26. `FeePayment`: Transaction receipts (id, receipt_no, student_id, fee_structure_id, amount_paid, payment_method [CASH, UPI, CARD, NET_BANKING, CHEQUE], reference_no, status [PAID, PARTIAL], cashier_user_id, paid_at).
27. `Notification`: Targeted user notifications (id, recipient_user_id [null=broadcast], title, message, category, priority, link, is_read, created_at).
28. `Announcement`: Official school bulletins (id, title, content, priority, published_by_user_id, target_audience, category, attachment_key, publish_date).
29. `AuditLog`: Immutable security audit trail (id, actor_user_id, action, target_type, target_id, ip_address, user_agent, request_id, details, created_at).
30. `Dormitory`: Hostel facilities (id, name, capacity, description).

## 6. Required Relationships & Constraints
- `Class` 1:N `Section` (FK `class_id`, cascade delete only if no enrollments).
- `Section` 1:N `StudentEnrollment` (Indexed on `[section_id, academic_year_id]`).
- `TeacherAssignment`: Unique constraint on `[teacher_id, academic_year_id, section_id, subject_id, assignment_type]`.
- Class Teacher exclusivity: Unique constraint on `[academic_year_id, section_id]` where `assignment_type = 'CLASS_TEACHER'` (only 1 Class Teacher per section per academic year).
- Attendance: Unique constraint on `[student_id, date]` (prevent duplicate daily mark entries).
- ExamMark: Unique constraint on `[exam_id, student_id, subject_id]`.
- Timetable Slot: Check constraint `start_time < end_time`. Anti-collision query logic for teacher and room overlapping time slots.

## 7. Required APIs (FastAPI Modular Monolith)
- **Auth**: `/api/v1/auth/login`, `/refresh`, `/logout`, `/password-change`, `/forgot-password`, `/reset-password`, `/me`.
- **Admin**: `/api/v1/admin/users`, `/students`, `/teachers`, `/classes`, `/sections`, `/subjects`, `/academic-years`, `/assignments/teachers`, `/timetables`, `/promotions`.
- **Teacher**: `/api/v1/teacher/dashboard`, `/classes`, `/subjects`, `/timetable`, `/attendance`, `/materials`, `/assignments`, `/marks`, `/audit`.
- **Student**: `/api/v1/student/dashboard`, `/academics/performance`, `/academics/report-card`, `/academics/subjects`, `/attendance`, `/timetable`, `/materials`, `/assignments`, `/notifications`, `/announcements`.
- **Parent**: `/api/v1/parent/dashboard`, `/wards`, `/wards/{student_id}/academics`, `/wards/{student_id}/attendance`, `/wards/{student_id}/fees`.
- **Academics & Operations**: `/api/v1/academics/*`, `/api/v1/examinations/*`, `/api/v1/fees/*`, `/api/v1/timetables/*`.
- **Infrastructure**: `/health/live`, `/health/ready`, `/api/v1/files/upload-url`, `/api/v1/files/download-url`.

## 8. Authentication Strategy
- Identity provider in FastAPI using OAuth2 Password Flow + Bearer JWT.
- Password Hashing: Argon2id (`passlib[argon2]`).
- Access Token: Short-lived (15 minutes), payload contains `sub` (user_id), `role`, `jti`.
- Refresh Token: Long-lived (7 days, or 30 days if remember_me), cryptographically random string (SHA-256 hashed in DB with revocation tracking).
- Rotation: Refresh token rotation on every `/refresh` call to detect reuse/theft.
- First-login workflow: `must_change_password=True` blocks all API calls except `/me` and `/password-change`.

## 9. Authorization Strategy
- Multi-tier authorization:
  1. Role-Based Access Control (`RoleChecker(['super_admin', 'admin'])`).
  2. Permission-Based Access Control (`PermissionChecker('attendance:write')`).
  3. Resource-Based / Assignment-Driven Access Control (Server validates `TeacherAssignment` in database for specific `section_id` and `subject_id`).
  4. Student/Parent Isolation: Student can only query records where `student.user_id == current_user.id`; Parent can only query records where `student_id in parent.linked_student_ids`.

## 10. Redis Strategy
- Shared central cache and coordination layer:
  - Cache-aside for static/semi-static master data (classes, sections, subjects, published timetables).
  - Sliding-window distributed rate limiting.
  - Active token revocation blacklist (`blacklist:{jti}`).
  - Pub/Sub or list-based asynchronous background task queue.

## 11. Caching Strategy
- TTL-governed key-value caching:
  - Master data (`classes`, `subjects`): TTL 1 hour.
  - Timetable (`timetable:section:{id}`): TTL 24 hours.
  - Invalidation hooks on write operations (e.g. updating timetable purges section and teacher cache).

## 12. Rate-Limiting Strategy
- Redis sliding-window algorithm:
  - `/api/v1/auth/login`: 5 requests/minute per IP + account lock threshold.
  - `/api/v1/auth/forgot-password`: 3 requests/hour per IP/account.
  - Authenticated APIs: 120 requests/minute per user.
  - File Uploads / Reports: 10 requests/minute per user.
  - Returns `429 Too Many Requests` with `Retry-After` header.

## 13. File Storage Strategy
- Object Storage abstraction (`LocalFileStorage` in dev, `S3CompatibleStorage` in production).
- Database stores only metadata (`storage_key`, `mime_type`, `size`, `original_filename`).
- Secure pre-signed / HMAC signed short-lived download URLs (5-15 min validity). No direct public access to private educational records.

## 14. Background Job Strategy
- Worker process utilizing Redis queues:
  - Bulk report generation (Tabulation sheets, PDF report cards).
  - Bulk attendance notification alerts to parents.
  - Email dispatch (Password resets).
  - Data import/export jobs.

## 15. Logging Strategy
- Structured JSON logging (`structlog` / Python standard library JSON formatter):
  - Injects `request_id`, `user_id`, `role`, `client_ip`, `method`, `path`, `status_code`, `latency_ms`.
  - Sensitive parameters masked (passwords, tokens, PII).

## 16. Audit Strategy
- Append-only `AuditLog` table populated via FastAPI middleware/events:
  - Captures actor ID, action, resource, resource ID, IP address, timestamp, diff summary.
  - Accessible strictly to Super Admin.

## 17. Testing Strategy
- Pytest suite:
  - Unit tests: Pydantic schemas, password hashing, timetable collision logic.
  - Integration tests: Database transactions, Alembic rollback, repository methods.
  - API Security tests: OWASP API Top 10 (BOLA/IDOR, Broken Auth, Function-level authorization, Rate limiting).
  - Cross-role privilege escalation tests (Teacher A -> Class B, Student -> other student marks).

## 18. Deployment Architecture
- Containerized Docker Compose setup:
  - `web`: Next.js frontend (Port 3000).
  - `api`: FastAPI backend with Uvicorn/Gunicorn (Port 8000).
  - `worker`: Background task worker.
  - `db`: PostgreSQL 16 (Port 5432).
  - `cache`: Redis 7 (Port 6379).
  - Reverse Proxy: Caddy/Nginx for TLS termination and header hardening.

## 19. Files to be Created
- Backend directory `backend/`:
  - `pyproject.toml` / `requirements.txt`
  - `alembic.ini`, `alembic/env.py`, `alembic/versions/`
  - `app/main.py`
  - `app/core/config.py`, `security.py`, `permissions.py`, `rate_limit.py`, `cache.py`, `logging.py`
  - `app/db/session.py`, `base.py`
  - `app/models/` (user, academic, attendance, timetable, exam, fee, material, assignment, audit)
  - `app/schemas/` (Pydantic request/response schemas)
  - `app/repositories/`
  - `app/services/`
  - `app/api/v1/` routers
  - `app/workers/`
  - `Dockerfile`, `docker-compose.yml`, `.env.example`
  - `tests/`
- Documentation:
  - `docs/frontend-backend-contract.md`
  - `docs/backend-architecture.md`
  - `docs/database-schema.md`

## 20. Files to be Modified
- Frontend `school-ms/`:
  - `src/lib/api-client.ts`: Centralized Axios/fetch client with JWT interceptor, refresh logic, error normalization.
  - `src/services/auth-service.ts`: Point to `http://localhost:8000/api/v1/auth/*` instead of mock localStorage.
  - `src/context/sms-store.tsx`: Transition from standalone localStorage CRUD to TanStack Query hooks fetching from FastAPI backend.
  - `next.config.ts`: Configure backend API proxy/rewrites for local dev.

## 21. Potential Breaking Changes & Mitigations
- *Change*: Transition from synchronous localStorage to asynchronous REST calls.
  - *Mitigation*: Maintain loading states and optimistic updates using React Query.
- *Change*: Strict server-side assignment authorization will reject actions allowed in mock mode (e.g. non-class-teacher marking attendance).
  - *Mitigation*: Ensure seed data reflects exact assignment hierarchy (Teacher 1 -> 10A Class Teacher, Teacher 2 -> Math Subject Teacher).

## 22. Migration Strategy
1. Phase 1: Standup FastAPI backend, PostgreSQL schema, Alembic migrations, Redis.
2. Phase 2: Seed realistic data aligning with frontend mock data.
3. Phase 3: Implement Auth endpoints, connect Next.js login/logout/session.
4. Phase 4: Progressively connect modules (Academics -> Teachers -> Attendance -> Timetable -> Exams -> Students -> Fees).
5. Phase 5: Deprecate client-side mock store once all endpoints verified.

## 23. Risks & Recommendations
- **Risk**: Stale authorization tokens after assignment updates.
  - **Recommendation**: Cache invalidation triggers in teacher assignment service; short JWT TTL.
- **Risk**: Timetable teacher collision race conditions.
  - **Recommendation**: Database-level check constraints and transaction row locks (`SELECT FOR UPDATE`) on timetable publication.
- **Risk**: N+1 queries on complex student tabulation sheets.
  - **Recommendation**: SQLAlchemy `selectinload` / `joinedload` on Marks, Subjects, and Students.
