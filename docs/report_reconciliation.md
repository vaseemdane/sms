# Report Reconciliation & Architecture Alignment

## 1. Resolution of Identified Conflicts

### Conflict 1: Audit Gap Status vs. Completed Implementation
- **Issue**: `implementation_gap_analysis.md` classified security bypasses and BOLA flaws as "Broken" or "Missing", while `production_readiness_report.md` claimed they were resolved.
- **Resolution**: This reflects the development lifecycle. The initial audit captured the legacy baseline where `sms_jwt_` bypasses, unauthenticated routes, and hardcoded mocks existed. All identified vulnerabilities were systematically fixed in the codebase during this implementation turn, and subsequently verified with the 21-test automated suite. Both documents now align chronologically.

### Conflict 2: Ordinary School Admin vs. Principal Academic Authority
- **Issue**: An earlier draft of the role matrix marked School Admin as allowed to moderate and publish examination results, whereas the runtime `RoleChecker` restricted this to `["principal", "super_admin"]`.
- **Resolution**: Under standard school management governance:
  - **Principal (`principal`)** holds exclusive Academic Operational Authority: moderating teacher-submitted marks, returning marks for correction, approving grade books, publishing official report cards, and unlocking historical attendance sessions.
  - **Super Admin (`super_admin`)** holds platform governance authority and serves as the disaster-recovery fallback.
  - **School Admin (`admin`)** is an operational administrative role managing user provisioning, class/section structures, fee schedules, and institutional settings, but **strictly lacks authority to moderate or publish academic exam marks**.
  - **Code & Matrix Update**: Both `role_permission_matrix.md` and `backend/app/api/v1/examinations.py` now explicitly restrict moderation (`/{id}/moderate`) and result publication (`/{id}/publish-results`) to `["principal", "super_admin"]`.

### Conflict 3: `ParentChildLink` Field Naming & Entity Model
- **Issue**: Some audit documents referenced `parent_id` and `student_id`, while other references mentioned `guardian_user_id` or `verified_status`.
- **Resolution**: Inspection of the SQLAlchemy model in `backend/app/models/student.py` confirms the exact database columns:
  - `id`: `String(64)`, Primary Key
  - `parent_user_id`: `String(64)`, Foreign Key to `users.id`
  - `student_profile_id`: `String(64)`, Foreign Key to `student_profiles.id`
  - `relationship_type`: `String(32)`, e.g. "Father", "Mother", "Guardian"
  - `is_primary_contact`: `Boolean`, default `True`
  - Unique Constraint: `uq_parent_student_link` on `(parent_user_id, student_profile_id)`.
  All API handlers (`attendance.py`, `students.py`, `parents.py`, `school_operations.py`) have been reconciled to query these exact model attributes.

### Conflict 4: Payment Gateway Verification vs. Offline Pending State
- **Issue**: The original codebase marked applications as `PAID` whenever a client passed a non-empty `paymentReference`.
- **Resolution**: In production environments without live Razorpay/Stripe webhook credentials, client-supplied payment strings cannot be trusted. The endpoint `POST /api/v1/admissions/public/apply` now registers applications with `app_fee_status = "PENDING_VERIFICATION"` and `status = "SUBMITTED"`. Confirmation occurs only when an authorized cashier/accountant verifies the payment or a cryptographic webhook callback is received.

### Conflict 5: Frontend `localStorage` Store vs. Server-Authoritative State
- **Issue**: `school-ms/src/context/sms-store.tsx` contained a large local-storage cache (`edupulse_sms_clean_production_v5`) with hardcoded mock lists.
- **Resolution**: All newly built pages (`/student/academics/assignments`, `/student/academics/materials`) call the FastAPI backend directly via `apiClient`. Furthermore, `parent-dashboard.tsx` now dynamically loads linked wards from `/api/v1/parent/wards` on mount rather than relying solely on static arrays.
