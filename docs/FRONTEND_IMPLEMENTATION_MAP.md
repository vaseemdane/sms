# Frontend Implementation Map — EduPulse SMS (Indian School Management System)

> Generated from: docs 01–29 (reverse engineering reports) + build plan
> Status key: `PENDING` | `IN_PROGRESS` | `DONE`

---

## Module: Authentication (AUTH)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-AUTH-001 | Dual email/username login | `/auth/login` | `LoginForm` | Guest | loading, error, success | `POST /api/v1/auth/login` | PENDING |
| FE-AUTH-002 | Forgot password — email request | `/auth/forgot-password` | `ForgotPasswordForm` | Guest | loading, success, error | `POST /api/v1/auth/forgot-password` | PENDING |
| FE-AUTH-003 | Password reset via token | `/auth/reset-password` | `ResetPasswordForm` | Guest | loading, success, error | `POST /api/v1/auth/reset-password` | PENDING |
| FE-AUTH-004 | Logout | Header dropdown | `UserMenu` | All | — | `POST /api/v1/auth/logout` | PENDING |
| FE-AUTH-005 | Remember me checkbox | `/auth/login` | `LoginForm` | Guest | — | — | PENDING |

---

## Module: Dashboard (DASH)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-DASH-001 | Super Admin / Admin dashboard with KPI tiles | `/dashboard` | `StatCard` × 5 | super_admin, admin | loading, empty | `GET /api/v1/dashboard/stats` | PENDING |
| FE-DASH-002 | Teacher dashboard (assigned classes/subjects) | `/dashboard` | `TeacherDashboard` | teacher | loading | `GET /api/v1/dashboard/teacher` | PENDING |
| FE-DASH-003 | Student dashboard (profile summary) | `/dashboard` | `StudentDashboard` | student | loading | `GET /api/v1/dashboard/student` | PENDING |
| FE-DASH-004 | Parent dashboard (children overview) | `/dashboard` | `ParentDashboard` | parent | loading | `GET /api/v1/dashboard/parent` | PENDING |
| FE-DASH-005 | Accountant dashboard (fee summary) | `/dashboard` | `AccountantDashboard` | accountant | loading | `GET /api/v1/dashboard/accountant` | PENDING |
| FE-DASH-006 | KPI: Total students, staff, classes, sections, dorms | `/dashboard` | `StatCard` | super_admin, admin | loading | `GET /api/v1/dashboard/stats` | PENDING |
| FE-DASH-007 | Quick action shortcuts | `/dashboard` | `QuickActions` | super_admin, admin | — | — | PENDING |
| FE-DASH-008 | Recent activity feed | `/dashboard` | `ActivityFeed` | super_admin, admin | loading, empty | `GET /api/v1/audit-logs` | PENDING |

---

## Module: Profile & Account (PROF)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-PROF-001 | Personal biodata edit form | `/settings/profile` | `ProfileForm` | All | loading, saving, error | `GET/PUT /api/v1/me` | PENDING |
| FE-PROF-002 | Avatar upload (photo) | `/settings/profile` | `AvatarUploader` | All | uploading, success, error | `POST /api/v1/upload/avatar` | PENDING |
| FE-PROF-003 | Self-service password change | `/settings/profile` | `ChangePasswordForm` | All | loading, success, error | `PUT /api/v1/me/password` | PENDING |

---

## Module: User & Staff Management (USER)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-USER-001 | Staff/user directory with role filter tabs | `/users` | `UserTable`, `RoleFilterTabs` | super_admin, admin | loading, empty, error | `GET /api/v1/users` | PENDING |
| FE-USER-002 | Create staff user modal/form | `/users` | `CreateUserModal` | super_admin, admin | saving, error | `POST /api/v1/users` | PENDING |
| FE-USER-003 | Edit staff profile page | `/users/[id]/edit` | `EditUserForm` | super_admin, admin | loading, saving | `GET/PUT /api/v1/users/:id` | PENDING |
| FE-USER-004 | View staff profile | `/users/[id]` | `UserProfileCard` | super_admin, admin | loading | `GET /api/v1/users/:id` | PENDING |
| FE-USER-005 | Admin password reset (default: 'user') | `/users` | `ResetPasswordButton` | super_admin | confirm dialog | `POST /api/v1/users/:id/reset-password` | PENDING |
| FE-USER-006 | Delete user (super_admin only, with guard) | `/users` | `DeleteUserButton` | super_admin | confirm dialog | `DELETE /api/v1/users/:id` | PENDING |
| FE-USER-007 | Block deletion of Head SA (id=1) | `/users` | `DeleteUserButton` | super_admin | disabled state | — | PENDING |
| FE-USER-008 | Block teacher deletion if assigned to subjects | `/users` | `DeleteUserButton` | super_admin | error toast | — | PENDING |

---

## Module: Student Lifecycle (STUD)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-STUD-001 | Multi-step student admission wizard (4 steps) | `/students/new` | `StudentAdmissionWizard` | super_admin, admin | loading, saving, error | `POST /api/v1/students` | PENDING |
| FE-STUD-002 | Step 1: Personal biodata (name, DOB, gender, blood group, address, Indian state/district/locality) | `/students/new` | `BiodataStep` | super_admin, admin | — | `GET /api/v1/geo/states` | PENDING |
| FE-STUD-003 | Step 2: Academic placement (class, section, adm number, year) | `/students/new` | `PlacementStep` | super_admin, admin | — | `GET /api/v1/academics/classes` | PENDING |
| FE-STUD-004 | Step 3: Guardian & hostel assignment | `/students/new` | `GuardianStep` | super_admin, admin | — | `GET /api/v1/users?role=parent` | PENDING |
| FE-STUD-005 | Step 4: Photo upload | `/students/new` | `PhotoStep` | super_admin, admin | uploading | `POST /api/v1/upload/avatar` | PENDING |
| FE-STUD-006 | Student class cohort list (section tabs) | `/classes/[classId]/students` | `StudentTable`, `SectionTabs` | super_admin, admin, teacher | loading, empty | `GET /api/v1/classes/:id/students` | PENDING |
| FE-STUD-007 | Student profile view (identity card + tabs) | `/students/[id]` | `StudentProfileCard`, `StudentTabs` | super_admin, admin, teacher, parent (own wards), student (self) | loading | `GET /api/v1/students/:id` | PENDING |
| FE-STUD-008 | Student record editor (class migration warning) | `/students/[id]/edit` | `EditStudentForm` | super_admin, admin | loading, saving | `GET/PUT /api/v1/students/:id` | PENDING |
| FE-STUD-009 | Class migration warning dialog | `/students/[id]/edit` | `ClassMigrationWarningDialog` | super_admin, admin | confirm | — | PENDING |
| FE-STUD-010 | Graduated alumni directory + restore button | `/students/graduated` | `GraduatedTable` | super_admin, admin | loading, empty | `GET /api/v1/students/graduated` | PENDING |
| FE-STUD-011 | Student password reset (default: 'student') | `/students/[id]` | `ResetStudentPasswordButton` | super_admin, admin | confirm | `POST /api/v1/students/:id/reset-password` | PENDING |
| FE-STUD-012 | Delete student (super_admin only) | `/students/[id]` | `DeleteStudentButton` | super_admin | confirm dialog | `DELETE /api/v1/students/:id` | PENDING |

---

## Module: Promotions (PROM)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-PROM-001 | Cohort promotion matrix — source/destination selectors | `/students/promotions` | `PromotionCohortSelector` | super_admin, admin | loading | `GET /api/v1/academics/classes` | PENDING |
| FE-PROM-002 | Student promotion list with P/D/G radio actions | `/students/promotions` | `PromotionStudentList` | super_admin, admin | loading, saving | `POST /api/v1/promotions` | PENDING |
| FE-PROM-003 | Bulk toggle: Promote All / Retain All | `/students/promotions` | `PromotionBulkActions` | super_admin, admin | — | — | PENDING |
| FE-PROM-004 | Promotion history & rollback table | `/students/promotions/history` | `PromotionHistoryTable` | super_admin, admin | loading, empty | `GET /api/v1/promotions/history` | PENDING |
| FE-PROM-005 | Single promotion rollback button | `/students/promotions/history` | `RollbackButton` | super_admin, admin | confirm | `DELETE /api/v1/promotions/:id` | PENDING |
| FE-PROM-006 | Reset All Promotions batch button | `/students/promotions/history` | `ResetAllButton` | super_admin, admin | confirm dialog | `DELETE /api/v1/promotions/reset-all` | PENDING |

---

## Module: Academic Core (ACAD)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-ACAD-001 | Class management (class type assignment, CRUD) | `/academics/classes` | `ClassTable`, `ClassFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/academics/classes` | PENDING |
| FE-ACAD-002 | Section/arm management (class teacher assignment) | `/academics/sections` | `SectionTable`, `SectionFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/academics/sections` | PENDING |
| FE-ACAD-003 | Subject management (teacher assignment) | `/academics/subjects` | `SubjectTable`, `SubjectFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/academics/subjects` | PENDING |
| FE-ACAD-004 | Cascade selector: class → sections | forms | `CascadeClassSection` | All | loading | `GET /api/v1/academics/classes/:id/sections` | PENDING |
| FE-ACAD-005 | Cascade selector: class → subjects (teacher-filtered) | forms | `CascadeClassSubject` | All | loading | `GET /api/v1/academics/classes/:id/subjects` | PENDING |
| FE-ACAD-006 | Dormitory/hostel management | `/hostels` | `DormTable`, `DormFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/hostels` | PENDING |

---

## Module: Examinations (EXAM)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-EXAM-001 | Exam term CRUD (term 1/2/3 per session) | `/academics/exams` | `ExamTable`, `ExamFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/academics/exams` | PENDING |
| FE-EXAM-002 | Grade scale CRUD (class-type scoped + universal) | `/academics/grades` | `GradeTable`, `GradeFormModal` | super_admin, admin | loading, empty | `GET/POST/PUT/DELETE /api/v1/academics/grades` | PENDING |

---

## Module: Marks & Assessment (MARK)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-MARK-001 | Mark entry selector (exam/class/section/subject cascade) | `/examinations/marks` | `MarkSelector` | super_admin, admin, teacher | — | cascades | PENDING |
| FE-MARK-002 | Subject score sheet (t1/t2/t3/t4/exm inline edit) | `/examinations/marks/entry` | `MarksheetMatrix` | super_admin, admin, teacher | loading, saving | `GET/PUT /api/v1/marks` | PENDING |
| FE-MARK-003 | Live score calculations (tca, tex) | `/examinations/marks/entry` | `MarksheetMatrix` | super_admin, admin, teacher | — | — | PENDING |
| FE-MARK-004 | Real-time grade letter resolution | `/examinations/marks/entry` | `MarksheetMatrix` | super_admin, admin, teacher | — | — | PENDING |
| FE-MARK-005 | Teacher/Principal remarks fields | `/examinations/marks/entry` | `RemarksPanel` | super_admin, admin, teacher | saving | `PUT /api/v1/marks/comments/:id` | PENDING |
| FE-MARK-006 | Behavioral skills ratings modal (affective/psychomotor 1–5) | `/examinations/marks/entry` | `SkillsModal` | super_admin, admin, teacher | saving | `PUT /api/v1/marks/skills/:id` | PENDING |
| FE-MARK-007 | Batch mark recalculation diagnostic | `/examinations/diagnostics` | `BatchRecalcSelector` | super_admin, admin | loading, success | `POST /api/v1/marks/batch-recalculate` | PENDING |
| FE-MARK-008 | Master broadsheet tabulation (screen view) | `/examinations/tabulation` | `TabulationSheet` | super_admin, admin | loading, empty | `GET /api/v1/marks/tabulation` | PENDING |
| FE-MARK-009 | Broadsheet print view | `/examinations/tabulation/print` | `TabulationPrint` | super_admin, admin | loading | `GET /api/v1/marks/tabulation` | PENDING |

---

## Module: Report Cards (REP)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-REP-001 | Student terminal report card (interactive screen) | `/students/[id]/report-card` | `ReportCardViewer` | super_admin, admin, teacher, student (PIN if locked), parent (PIN if locked) | loading, locked | `GET /api/v1/students/:id/report-card/:year` | PENDING |
| FE-REP-002 | Term selector (Term 1 / 2 / 3) on report card | `/students/[id]/report-card` | `TermSelector` | All | — | — | PENDING |
| FE-REP-003 | Printable report card view (`@media print`) | `/students/[id]/report-card/print` | `ReportCardPrint` | All | loading | — | PENDING |
| FE-REP-004 | PDF export button | `/students/[id]/report-card` | `DownloadPDFButton` | All | downloading | `GET /api/v1/students/:id/report-card/:year/pdf` | PENDING |
| FE-REP-005 | Exam lock interception — redirect to PIN entry | `/students/[id]/report-card` | `ExamLockGuard` | student, parent | locked | — | PENDING |

---

## Module: Scratch PINs (PIN)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-PIN-001 | PIN inventory (valid + used counters + table) | `/pins` | `PinInventory`, `PinTable` | super_admin, admin | loading, empty | `GET /api/v1/pins` | PENDING |
| FE-PIN-002 | Generate PIN batch (qty input, 500 ceiling) | `/pins/generate` | `GeneratePinForm` | super_admin, admin | loading, success | `POST /api/v1/pins/generate` | PENDING |
| FE-PIN-003 | Purge used/exhausted PINs | `/pins` | `PurgeButton` | super_admin, admin | confirm, loading | `DELETE /api/v1/pins/purge` | PENDING |
| FE-PIN-004 | PIN redemption entry screen (XXXXX-XXXXX-XXXXXX format) | `/pins/redeem/[studentId]` | `PinRedeemForm` | student, parent | loading, error, success | `POST /api/v1/pins/verify/:studentId` | PENDING |

---

## Module: Finance (FIN)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-FIN-001 | Master fee definitions table + create form | `/finance/fees` | `FeeTable`, `FeeFormModal` | super_admin, admin, accountant | loading, empty | `GET/POST /api/v1/finance/fees` | PENDING |
| FE-FIN-002 | Cashier fee collection ledger (class selector) | `/finance/cashier` | `CashierFeeLedger` | super_admin, admin, accountant | loading, empty | `GET /api/v1/finance/cashier` | PENDING |
| FE-FIN-003 | Inline installment payment input + submit | `/finance/cashier` | `PaymentInput` | super_admin, admin, accountant | saving, optimistic update | `POST /api/v1/finance/payments/pay` | PENDING |
| FE-FIN-004 | Student invoice ledger (cleared + uncleared) | `/finance/invoices/[studentId]` | `InvoiceLedger` | super_admin, admin, accountant, student (self), parent (own wards) | loading, empty | `GET /api/v1/finance/invoices/:studentId` | PENDING |
| FE-FIN-005 | View payment receipt (HTML) | `/finance/receipts/[id]` | `ReceiptViewer` | super_admin, admin, accountant, student, parent | loading | `GET /api/v1/finance/receipts/:id` | PENDING |
| FE-FIN-006 | Download PDF receipt button | `/finance/receipts/[id]` | `DownloadReceiptButton` | All authorized | downloading | `GET /api/v1/finance/receipts/:id/pdf` | PENDING |
| FE-FIN-007 | Payment record reset (delete receipts + restore) | `/finance/invoices/[studentId]` | `ResetPaymentButton` | super_admin, admin, accountant | confirm dialog | `DELETE /api/v1/finance/payments/:id/reset` | PENDING |
| FE-FIN-008 | INR currency display throughout (`₹1,25,000`) | Global | `formatINR()` util | All | — | — | PENDING |

---

## Module: Timetables (TIME)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-TIME-001 | Timetable directory (Routine + Exam type list) | `/academics/timetables` | `TimetableList` | All | loading, empty | `GET /api/v1/timetables` | PENDING |
| FE-TIME-002 | Create timetable form | `/academics/timetables` | `TimetableFormModal` | super_admin, admin | saving | `POST /api/v1/timetables` | PENDING |
| FE-TIME-003 | Timetable grid editor (days × time slots) | `/academics/timetables/[id]/builder` | `TimetableGridEditor` | super_admin, admin | loading, saving | `GET/PUT /api/v1/timetables/:id` | PENDING |
| FE-TIME-004 | Time slot creator modal | `/academics/timetables/[id]/builder` | `TimeSlotModal` | super_admin, admin | saving | `POST /api/v1/timetables/:id/slots` | PENDING |
| FE-TIME-005 | Clone time slots from another timetable | `/academics/timetables/[id]/builder` | `CloneSlotsModal` | super_admin, admin | saving | `POST /api/v1/timetables/:id/clone-slots` | PENDING |
| FE-TIME-006 | Schedule viewer (weekly grid view) | `/academics/timetables/[id]` | `TimetableViewer` | All | loading | `GET /api/v1/timetables/:id` | PENDING |
| FE-TIME-007 | Schedule print view | `/academics/timetables/[id]/print` | `TimetablePrint` | All | loading | `GET /api/v1/timetables/:id` | PENDING |

---

## Module: Parent Portal (PAR)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-PAR-001 | Multi-child overview cards | `/parent/wards` | `WardCard` | parent | loading, empty | `GET /api/v1/parent/wards` | PENDING |
| FE-PAR-002 | Quick links per ward (marksheet, timetable, fees) | `/parent/wards` | `WardCard` | parent | — | — | PENDING |

---

## Module: System Settings (SETT)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-SETT-001 | Academic session string, term start/end dates | `/settings/institution` | `InstitutionSettingsForm` | super_admin | loading, saving | `GET/PUT /api/v1/settings` | PENDING |
| FE-SETT-002 | Exam lock toggle (`lock_exam`) | `/settings/institution` | `ExamLockToggle` | super_admin | saving | `PUT /api/v1/settings` | PENDING |
| FE-SETT-003 | School logo upload | `/settings/institution` | `LogoUploader` | super_admin | uploading | `POST /api/v1/upload/logo` | PENDING |
| FE-SETT-004 | Next term fee schedule per class type | `/settings/institution` | `NextTermFeeTable` | super_admin | loading, saving | `GET/PUT /api/v1/settings` | PENDING |
| FE-SETT-005 | CBSE affiliation number, UDISE+ code, board selection | `/settings/institution` | `InstitutionSettingsForm` | super_admin | saving | `PUT /api/v1/settings` | PENDING |

---

## Module: Indian Localization (LOC)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-LOC-001 | State/UT selector (36+8 Indian states) | All forms | `StateSelector` | All | — | `GET /api/v1/geo/states` | PENDING |
| FE-LOC-002 | District selector (cascades on state change) | All forms | `DistrictSelector` | All | loading | `GET /api/v1/geo/states/:id/districts` | PENDING |
| FE-LOC-003 | Locality selector (city/town/village) | All forms | `LocalitySelector` | All | loading | `GET /api/v1/geo/districts/:id/localities` | PENDING |
| FE-LOC-004 | PIN Code validation (`^[1-9][0-9]{5}$`) | All forms | Zod schema | All | validation | — | PENDING |
| FE-LOC-005 | Phone validation (`+91` + `^[6-9][0-9]{9}$`) | All forms | Zod schema | All | validation | — | PENDING |
| FE-LOC-006 | INR currency formatting (`₹1,25,000`) | Finance pages | `formatINR()` | All | — | — | PENDING |
| FE-LOC-007 | Indian academic year display (2026-2027, April–March) | Settings, reports | `AcademicYearDisplay` | All | — | — | PENDING |

---

## Module: Legal (LEGAL)

| ID | Requirement | Page | Component | User Role | State | API Dependency | Status |
|---|---|---|---|---|---|---|---|
| FE-LEGAL-001 | Privacy Policy static page | `/legal/privacy` | `LegalPage` | Public | — | — | PENDING |
| FE-LEGAL-002 | Terms of Use static page | `/legal/terms` | `LegalPage` | Public | — | — | PENDING |

---

## Module: Shared UI States (UI)

| ID | Requirement | Component | Notes | Status |
|---|---|---|---|---|
| FE-UI-001 | Skeleton loading states | `Skeleton` | All data-dependent views | PENDING |
| FE-UI-002 | Empty state with action | `EmptyState` | All list/table views | PENDING |
| FE-UI-003 | Error state with retry | `ErrorState` | All async views | PENDING |
| FE-UI-004 | Toast notifications (success/error/warning) | `Toast` + `Toaster` | Global | PENDING |
| FE-UI-005 | Confirm/destructive dialogs | `AlertDialog` | Delete, reset, promote actions | PENDING |
| FE-UI-006 | Permission-denied screen | `UnauthorizedPage` | 403 | PENDING |
| FE-UI-007 | 404 not found | `NotFoundPage` | — | PENDING |
| FE-UI-008 | Responsive sidebar (collapse on mobile) | `AppSidebar` | All authenticated routes | PENDING |

---

## Total summary

| Module | Feature count | Status |
|---|---|---|
| Authentication | 5 | PENDING |
| Dashboard | 8 | PENDING |
| Profile | 3 | PENDING |
| User Management | 8 | PENDING |
| Student Lifecycle | 12 | PENDING |
| Promotions | 6 | PENDING |
| Academic Core | 6 | PENDING |
| Examinations | 2 | PENDING |
| Marks & Assessment | 9 | PENDING |
| Report Cards | 5 | PENDING |
| Scratch PINs | 4 | PENDING |
| Finance | 8 | PENDING |
| Timetables | 7 | PENDING |
| Parent Portal | 2 | PENDING |
| System Settings | 5 | PENDING |
| Indian Localization | 7 | PENDING |
| Legal | 2 | PENDING |
| Shared UI States | 8 | PENDING |
| **TOTAL** | **107** | **0 DONE** |
