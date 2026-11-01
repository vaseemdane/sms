# Final Behavioral Parity Checklist: LAV_SMS Rebuild

Every capability reverse engineered from the legacy codebase is cataloged below. In the subsequent implementation phase, no item may be marked COMPLETE until its underlying behavior, API contract, database state, authorization rules, and edge cases have been independently tested and verified.

## Status Legend
- `[D]` = DISCOVERED (Reverse engineered and documented in analysis phase)
- `[I]` = IMPLEMENTED (Rebuilt in modern codebase)
- `[T]` = TESTED (Automated unit/integration test passing)
- `[V]` = VERIFIED (Manual E2E & parity verified against legacy behavior)

---

### 1. Authentication & System Access
- [D] [ ] [ ] [ ] **PAR-AUTH-001**: Dual login via Email or Username (`LoginController@username`).
- [D] [ ] [ ] [ ] **PAR-AUTH-002**: Password reset via email token with expiration.
- [D] [ ] [ ] [ ] **PAR-AUTH-003**: Remember Me authentication token persistence.
- [D] [ ] [ ] [ ] **PAR-AUTH-004**: Authenticated session invalidation upon logout.
- [D] [ ] [ ] [ ] **PAR-AUTH-005**: Self-service profile editing and avatar image upload.
- [D] [ ] [ ] [ ] **PAR-AUTH-006**: Self-service password change verifying current password hash.

### 2. Authorization & RBAC
- [D] [ ] [ ] [ ] **PAR-RBAC-001**: Super Admin role (Level 1) full institutional control.
- [D] [ ] [ ] [ ] **PAR-RBAC-002**: Admin role (Level 2) restricted from managing Super Admins.
- [D] [ ] [ ] [ ] **PAR-RBAC-003**: Root Super Admin protection (immutable user ID 1 / system root).
- [D] [ ] [ ] [ ] **PAR-RBAC-004**: Destructive deletion restricted exclusively to Super Admin.
- [D] [ ] [ ] [ ] **PAR-RBAC-005**: Teacher score entry restricted to allocated subjects.
- [D] [ ] [ ] [ ] **PAR-RBAC-006**: Student access restricted strictly to own profile, marksheet, invoices.
- [D] [ ] [ ] [ ] **PAR-RBAC-007**: Parent access restricted strictly to linked children (`my_parent_id`).
- [D] [ ] [ ] [ ] **PAR-RBAC-008**: Accountant role restricted to fee definitions and cash receipting.

### 3. User & Staff Management
- [D] [ ] [ ] [ ] **PAR-USER-001**: User directory with role filtering tabs.
- [D] [ ] [ ] [ ] **PAR-USER-002**: Staff user creation with auto-generated staff code (`{APP}/STAFF/{Y}/{m}/{RAND}`).
- [D] [ ] [ ] [ ] **PAR-USER-003**: Forced administrative password reset (defaults to 'user').
- [D] [ ] [ ] [ ] **PAR-USER-004**: Block teacher deletion if teacher is assigned to active curriculum subjects.
- [D] [ ] [ ] [ ] **PAR-USER-005**: Deleting user purges linked file storage directory.

### 4. Student Lifecycle & Academic Operations
- [D] [ ] [ ] [ ] **PAR-STUD-001**: Multi-step student admission wizard.
- [D] [ ] [ ] [ ] **PAR-STUD-002**: Auto-generated admission number (`{APP}/{CT}/{YEAR}/{ADM_NO}`).
- [D] [ ] [ ] [ ] **PAR-STUD-003**: Default password set to 'student' upon admission.
- [D] [ ] [ ] [ ] **PAR-STUD-004**: Forced student password reset by Support Team.
- [D] [ ] [ ] [ ] **PAR-STUD-005**: Student class directory filtered by section tabs.
- [D] [ ] [ ] [ ] **PAR-STUD-006**: Student profile view with identity card and quick action links.
- [D] [ ] [ ] [ ] **PAR-STUD-007**: Class migration mark cleanup (`deleteOldRecord`).
- [D] [ ] [ ] [ ] **PAR-STUD-008**: Alumni graduation status toggle (`grad = 1`, `grad_date`).
- [D] [ ] [ ] [ ] **PAR-STUD-009**: Un-graduation restoring student to active academic session.
- [D] [ ] [ ] [ ] **PAR-STUD-010**: Cohort promotion matrix with Promote ('P'), Retain ('D'), Graduate ('G').
- [D] [ ] [ ] [ ] **PAR-STUD-011**: Single student promotion rollback.
- [D] [ ] [ ] [ ] **PAR-STUD-012**: Batch promotion rollback with new session marks cleanup (`delete_old_marks`).

### 5. Academic Curriculum & Structure
- [D] [ ] [ ] [ ] **PAR-ACAD-001**: Class Types configuration (Nursery, Primary, Junior, Senior).
- [D] [ ] [ ] [ ] **PAR-ACAD-002**: Class CRUD with Class Type linking.
- [D] [ ] [ ] [ ] **PAR-ACAD-003**: Section / Arm CRUD with Class Teacher assignment.
- [D] [ ] [ ] [ ] **PAR-ACAD-004**: Curriculum Subject CRUD with Class and Subject Teacher assignment.
- [D] [ ] [ ] [ ] **PAR-ACAD-005**: Dynamic cascading dropdowns for State -> LGA and Class -> Sections/Subjects.

### 6. Examinations, Marks & Report Cards
- [D] [ ] [ ] [ ] **PAR-MARK-001**: Exam term (1, 2, 3) creation per session.
- [D] [ ] [ ] [ ] **PAR-MARK-002**: Grade scale threshold definition scoped by Class Type with universal fallback.
- [D] [ ] [ ] [ ] **PAR-MARK-003**: Continuous assessment score entry grid (`t1`, `t2`, `t3`, `t4`, `exm`).
- [D] [ ] [ ] [ ] **PAR-MARK-004**: Automatic score calculations (`tca = t1+t2+t3+t4`, `tex = tca + exm`).
- [D] [ ] [ ] [ ] **PAR-MARK-005**: Grade letter and point mapping from total score.
- [D] [ ] [ ] [ ] **PAR-MARK-006**: Cumulative Term 3 score calculation (`tex1 + tex2 + tex3`).
- [D] [ ] [ ] [ ] **PAR-MARK-007**: Student aggregate total, term average, and cohort class average computation.
- [D] [ ] [ ] [ ] **PAR-MARK-008**: Cohort position / rank calculation with ordinal suffix (1st, 2nd, 3rd...).
- [D] [ ] [ ] [ ] **PAR-MARK-009**: Affective and psychomotor behavioral skills ratings (1-5).
- [D] [ ] [ ] [ ] **PAR-MARK-010**: Form teacher and Principal narrative remarks.
- [D] [ ] [ ] [ ] **PAR-MARK-011**: Batch mark recalculation diagnostic tool (`/marks/batch_fix`).
- [D] [ ] [ ] [ ] **PAR-MARK-012**: Master Broadsheet Tabulation matrix (screen + printable view).
- [D] [ ] [ ] [ ] **PAR-MARK-013**: Student terminal report card view with school branding and fee schedule.
- [D] [ ] [ ] [ ] **PAR-MARK-014**: Printable vector report card generation.

### 7. Scratch Card PIN Security Engine
- [D] [ ] [ ] [ ] **PAR-PIN-001**: 16-character voucher generation (`XXXXX-XXXXX-XXXXXX`).
- [D] [ ] [ ] [ ] **PAR-PIN-002**: Batch generation ceiling (max 500 valid pins).
- [D] [ ] [ ] [ ] **PAR-PIN-003**: PIN redemption usage counter (maximum 5 accesses).
- [D] [ ] [ ] [ ] **PAR-PIN-004**: Student locking on first redemption (cannot be shared).
- [D] [ ] [ ] [ ] **PAR-PIN-005**: Purge exhausted / used scratch PINs.
- [D] [ ] [ ] [ ] **PAR-PIN-006**: Exam lock setting (`lock_exam = 1`) intercepting report card views.

### 8. Financial Billing, Cashiering & Receipts
- [D] [ ] [ ] [ ] **PAR-PAY-001**: Master fee definition per class and academic session.
- [D] [ ] [ ] [ ] **PAR-PAY-002**: Automatic invoice generation for enrolled students upon fee creation.
- [D] [ ] [ ] [ ] **PAR-PAY-003**: Cashier collection ledger with student invoice tracking.
- [D] [ ] [ ] [ ] **PAR-PAY-004**: Partial installment payments with ACID transaction safety.
- [D] [ ] [ ] [ ] **PAR-PAY-005**: Running balance calculation and automatic 'paid' clearance flag.
- [D] [ ] [ ] [ ] **PAR-PAY-006**: Unique receipt reference code generation (`YYYY/RANDOM_6`).
- [D] [ ] [ ] [ ] **PAR-PAY-007**: Cashier payment record reset (deletes receipts, restores balance).
- [D] [ ] [ ] [ ] **PAR-PAY-008**: Printable HTML cash receipt view.
- [D] [ ] [ ] [ ] **PAR-PAY-009**: Downloadable vector PDF payment receipt.

### 9. Timetable & Scheduling
- [D] [ ] [ ] [ ] **PAR-TIME-001**: Timetable records for Routine and Exam schedules.
- [D] [ ] [ ] [ ] **PAR-TIME-002**: Dynamic time slot generation with start/end hours and meridians.
- [D] [ ] [ ] [ ] **PAR-TIME-003**: Schedule matrix editor assigning subjects to days and time slots.
- [D] [ ] [ ] [ ] **PAR-TIME-004**: Duplicate / copy time slots from another timetable record.
- [D] [ ] [ ] [ ] **PAR-TIME-005**: Formatted weekly schedule viewer and print layout.

### 10. Boarding, Parent Portal & System Settings
- [D] [ ] [ ] [ ] **PAR-DORM-001**: Hostel / Dormitory CRUD and room assignment.
- [D] [ ] [ ] [ ] **PAR-PAR-001**: Multi-child Parent Portal dashboard.
- [D] [ ] [ ] [ ] **PAR-SETT-001**: Global institutional settings (session, term dates, branding, fees).
- [D] [ ] [ ] [ ] **PAR-SETT-002**: School logo upload and storage.
