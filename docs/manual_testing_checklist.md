# Manual & E2E Testing Verification Execution Log

## Test Execution Summary
- **Execution Date**: 2026-10-26
- **Environment**: Local Development (FastAPI + SQLAlchemy NullPool + Next.js 16.4.2 Turbopack)
- **Automated Test Results**: 21 passed in 3.56s (`tests/test_api_security.py`, `tests/test_owasp_api_security.py`, `tests/test_password_utils.py`, `tests/test_zoho_workflow_verification.py`)
- **Frontend Production Build**: 63 routes generated with 0 errors.

---

## Detailed Test Cases

### TC-01: Valid Authentication & JWT Generation
- **Preconditions**: User `admin@school.com` exists with active password `SuperAdmin@123`.
- **Action**: `POST /api/v1/auth/login` with correct credentials.
- **Expected Result**: HTTP 200, JWT access token returned with role `super_admin`.
- **Actual Result**: HTTP 200, JWT token returned, signed with HMAC-SHA256.
- **Status**: **PASS**
- **Evidence**: `tests/test_api_security.py::test_authentication_flow`

### TC-02: Insecure Token Bypass Rejection
- **Preconditions**: Client sends dummy bearer token `sms_jwt_usr-student-1_1729000000`.
- **Action**: `GET /api/v1/attendance/student` with dummy header.
- **Expected Result**: HTTP 401 Unauthorized ("Invalid or expired token").
- **Actual Result**: HTTP 401 Unauthorized.
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_auth_02_dev_bypass_token_rejected`

### TC-03: Protected Route Enforcement
- **Preconditions**: No `Authorization` header supplied.
- **Action**: `GET /api/v1/operations/lesson-notes` and `GET /api/v1/materials/section/sec-10a`.
- **Expected Result**: HTTP 401 Unauthorized ("Authentication required").
- **Actual Result**: HTTP 401 Unauthorized for both endpoints.
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_auth_01_unauthenticated_rejected`

### TC-04: RBAC — Student Blocked from Admin Dashboard
- **Preconditions**: Authenticated as `student@school.com` (`usr-student-1`).
- **Action**: `GET /api/v1/admin/dashboard/stats`.
- **Expected Result**: HTTP 403 Forbidden.
- **Actual Result**: HTTP 403 Forbidden ("Access denied. Requires one of roles: ['super_admin', 'admin']").
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_rbac_01_student_blocked_from_admin`

### TC-05: RBAC — Teacher Blocked from Exam Publication
- **Preconditions**: Authenticated as teacher `rajesh.math@edupulse.edu.in`.
- **Action**: `POST /api/v1/examinations/ex-1/publish-results`.
- **Expected Result**: HTTP 403 Forbidden (Principal/Super Admin authority only).
- **Actual Result**: HTTP 403 Forbidden.
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_rbac_03_teacher_blocked_from_exam_publish`

### TC-06: BOLA — Parent Isolated from Unlinked Student Records
- **Preconditions**: Authenticated as Parent (`usr-parent-1`), with no link to student `sp-1`.
- **Action**: `GET /api/v1/attendance/student?student_id=sp-1`.
- **Expected Result**: HTTP 403 Forbidden ("Access denied. You can only view attendance for your verified linked children").
- **Actual Result**: HTTP 403 Forbidden.
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_scope_parent_unlinked_child_blocked`

### TC-07: Marks Boundary Validation
- **Preconditions**: Teacher submits marks with test score > 100 or total > 100.
- **Action**: `POST /api/v1/examinations/marks` with `testScore: 105.0`.
- **Expected Result**: HTTP 422 Unprocessable Entity.
- **Actual Result**: HTTP 422 Unprocessable Entity ("Test score 105.0 out of range [0, 100]").
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_grade_bounds_validation`

### TC-08: Assignment End-to-End Lifecycle
- **Preconditions**: Teacher assigned to Class 10A; student enrolled in Class 10A.
- **Action**: Teacher creates assignment via `POST /api/v1/materials/assignments`; student submits work via `POST /api/v1/materials/assignments/{id}/submissions`.
- **Expected Result**: Assignment created with ID; submission registered with status `SUBMITTED` and ISO timestamp.
- **Actual Result**: Assignment created (HTTP 200); submission recorded (HTTP 200).
- **Status**: **PASS**
- **Evidence**: `tests/test_zoho_workflow_verification.py::test_assignment_workflow`

### TC-09: Class Teacher Attendance Authority
- **Preconditions**: Teacher 1 is Class Teacher of 10A; Teacher 2 is Science Subject Teacher for 10A (not Class Teacher).
- **Action**: Teacher 1 marks attendance for 10A; Teacher 2 attempts to mark attendance for 10A.
- **Expected Result**: Teacher 1 succeeds (HTTP 200); Teacher 2 rejected with HTTP 403 Forbidden.
- **Actual Result**: Teacher 1 recorded 2 attendance rows; Teacher 2 returned HTTP 403 ("strictly restricted to designated Class Teachers").
- **Status**: **PASS**
- **Evidence**: `tests/test_api_security.py::test_attendance_assignment_authorization`

### TC-10: Material Upload Section Scope
- **Preconditions**: Teacher 2 assigned to 10A, but not 9A.
- **Action**: Teacher 2 attempts to upload study material targeting section `sec-9a`.
- **Expected Result**: HTTP 403 Forbidden.
- **Actual Result**: HTTP 403 Forbidden ("not assigned to target section").
- **Status**: **PASS**
- **Evidence**: `tests/test_api_security.py::test_material_upload_assignment_authorization`

### TC-11: Public Admission Application Untrusted Payment Reference
- **Preconditions**: Unauthenticated public user submits admission application with arbitrary `paymentReference: "FAKE_TXN_999"`.
- **Action**: `POST /api/v1/admissions/public/apply`.
- **Expected Result**: Application created with `status = "SUBMITTED"` and `app_fee_status = "PENDING_VERIFICATION"`, never auto-marked as `PAID`.
- **Actual Result**: `app_fee_status` initialized to `PENDING_VERIFICATION`.
- **Status**: **PASS**
- **Evidence**: Verified by code inspection and endpoint test.

### TC-12: Live Principal Analytics Calculation
- **Preconditions**: Database populated with real `ExamMark` and `Attendance` records.
- **Action**: `GET /api/v1/principal/performance-analytics` and `GET /api/v1/principal/attendance-analytics`.
- **Expected Result**: Live SQL aggregation returning actual student names and section averages without static fallback arrays.
- **Actual Result**: Live database query executed and returned formatted analytics response.
- **Status**: **PASS**
- **Evidence**: Verified by endpoint response inspection.
