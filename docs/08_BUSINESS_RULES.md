# Business Rules Specification: LAV_SMS

## 1. Authentication & User Management Rules

- **BR-AUTH-001: Multi-Identifier Identity Resolution**: Authentication accepts either an RFC-compliant email address or an alphanumeric username. The system checks `filter_var($identity, FILTER_VALIDATE_EMAIL)`: if valid email, queries `email`; otherwise queries `username`.
- **BR-USER-001: Head Super Admin Immutability**: The root Super Admin (`id === 1`, defined via `Qs::headSA($id)`) cannot be edited, deleted, downgraded, or reset by any user, including other super admins.
- **BR-USER-002: Administrative Privilege Ceiling**: An `admin` (Level 2) can only create, view, or manage users with `level > 2` (Teacher, Parent, Accountant, Librarian, Student). Super Admins (Level 1) cannot be modified by Admins.
- **BR-USER-003: Staff ID Code Generation**: Staff users are assigned a deterministic username format upon creation:
  `{APP_CODE}/STAFF/{YEAR}/{MONTH}/{RANDOM_4_DIGITS}` (e.g., `CJIA/STAFF/2026/10/4892`).
- **BR-USER-004: Hardcoded Password Resets**:
  - Administrative reset of a student (`StudentRecordController@reset_pass`) sets password to bcrypt hash of string `'student'`.
  - Administrative reset of a staff member (`UserController@reset_pass`) sets password to bcrypt hash of string `'user'`.
- **BR-USER-005: Teacher Deletion Constraint**: A teacher cannot be deleted if currently assigned as the instructor for one or more active curriculum subjects.

## 2. Student Admission & Academic Session Rules

- **BR-STUD-001: Admission Number Generation**: Student admission numbers (`adm_no`) and initial usernames follow the deterministic convention:
  `{APP_CODE}/{CLASS_TYPE_CODE}/{YEAR_ADMITTED}/{ADMISSION_NUMBER_OR_RANDOM_5_DIGITS}` (e.g., `CJIA/J/2026/83921`).
- **BR-STUD-002: Class Migration Mark Cleanup**: If a student's class (`my_class_id`) is updated within the current academic session, all existing `marks` and `exam_records` belonging to the previous class in that session are deleted via `Mk::deleteOldRecord()` to prevent cross-grade score corruption.
- **BR-STUD-003: Graduation Lifecycle**:
  - Marking a student graduated sets `grad = 1`, `grad_date = current_session`.
  - Un-graduating (`not_graduated`) resets `grad = 0`, `grad_date = NULL`, and reinstates `session = current_session`.

## 3. Academic Promotions Engine Rules

- **BR-PROM-001: Cohort Promotion Actions**:
  - Status `'P'` (Promote): Student is migrated to target class (`to_class`) and section (`to_section`); `session` increments to next session (e.g., `'2018-2019'` -> `'2019-2020'`).
  - Status `'D'` (Don't Promote / Repeat): Student remains in current class (`from_class`) and section (`from_section`); `session` updates to next session.
  - Status `'G'` (Graduated): Student remains in current class; `grad = 1`, `grad_date = current_session`.
- **BR-PROM-002: Single & Batch Promotion Rollback**:
  - Resetting a single promotion reverts the student to `from_class`, `from_section`, `from_session`, clears `grad` status, and removes the promotion record.
  - Resetting all promotions (`reset_all`) reverts all students and deletes any marks already submitted for the new academic session (`delete_old_marks`).

## 4. Assessment, Grading & Ranking Rules

- **BR-MARK-001: Continuous Assessment Aggregation**:
  Total subject score for a term is calculated as:
  `tex = tca + exm`, where `tca = t1 + t2 + t3 + t4`.
- **BR-MARK-002: Grade Scale Resolution**:
  - The system evaluates total subject score against `grades` where `mark_from <= score <= mark_to`.
  - Resolution precedence:
    1. Grade matching the class's `class_type_id`.
    2. Fallback universal grade where `class_type_id IS NULL`.
- **BR-MARK-003: Term & Cumulative Averages**:
  - Terms 1 & 2: Terminal average is calculated across all subjects where `tex > 0`.
  - Term 3: Cumulative mark includes cumulative score across all three terms (`tex1 + tex2 + tex3`) and cumulative average (`cum_ave = (tex1 + tex2 + tex3) / count_of_offered_terms`).
- **BR-MARK-004: Position / Rank In Class**:
  - Positions are computed by ranking students by their total aggregate marks in descending order within their class cohort (`Mk::getPos()`).
  - Ordinal suffix added to position (1st, 2nd, 3rd, 4th... using `Mk::getSuffix()`).
- **BR-MARK-005: Exam Result Access Control (`lock_exam`)**:
  - If setting `lock_exam == 1`, non-admin users (Students and Parents) are blocked from viewing marksheets or report cards.
  - Access is granted only after providing a valid scratch card PIN verified in the active session.

## 5. Scratch Card PIN Rules

- **BR-PIN-001: PIN Generation Format**: Scratch PIN tokens are generated as 16-character uppercase alphanumeric strings separated by hyphens:
  `XXXXX-XXXXX-XXXXXX` (e.g., `8F3J2-9K2L1-82N9Q1`).
- **BR-PIN-002: Usage Counter & Lifetime**:
  - A single PIN allows a maximum of 5 successful verification accesses (`times_used < 6`).
  - Once redeemed for a specific student, the PIN is locked to that `student_id` and cannot be used by or for another student.
- **BR-PIN-003: Maximum Inventory Ceiling**: The system prevents generating new PIN batches if the count of valid unexhausted PINs exceeds 500.

## 6. Financial Billing & Receipting Rules

- **BR-PAY-001: Automatic Student Invoice Generation**: When a new payment definition is created for a class (`my_class_id`), the system automatically inserts a `payment_records` invoice for every active student currently enrolled in that class.
- **BR-PAY-002: Partial Payments & Settled Status**:
  - Payments can be made in installments. Each installment deducts from `balance` and adds to `amt_paid`.
  - When `balance == 0`, `paid` is flagged as `1`.
  - Every transaction generates a receipt record with unique `ref_no = date('Y') . '/' . mt_rand(10000, 999999)`.
- **BR-PAY-003: Payment Record Reset**: Resetting a payment record deletes all linked cash receipts and resets `amt_paid = 0`, `balance = original_amt`, and `paid = 0`.
