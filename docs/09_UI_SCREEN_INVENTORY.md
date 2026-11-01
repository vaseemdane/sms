# UI Screen Inventory: LAV_SMS

## 1. Authentication & System Public Screens
- **SCR-AUTH-01: Login Screen**
  - Route: `/login`
  - Template: `resources/views/auth/login.blade.php`
  - Components: Dual identity input (`email` or `username`), `password`, `remember_me` checkbox, submit button, link to password recovery.
- **SCR-AUTH-02: Password Reset Request**
  - Route: `/password/reset`
  - Template: `resources/views/auth/passwords/email.blade.php`
  - Components: Email input, submit link request.
- **SCR-AUTH-03: Password Reset Confirmation**
  - Route: `/password/reset/{token}`
  - Template: `resources/views/auth/passwords/reset.blade.php`
  - Components: Hidden token, email, new password, confirmation password.
- **SCR-PUB-01: Privacy Policy & Terms of Use**
  - Routes: `/privacy-policy`, `/terms-of-use`
  - Templates: `resources/views/pages/other/privacy_policy.blade.php`, `terms_of_use.blade.php`
  - Components: Static legal disclosures with dynamic institutional variables.

## 2. Core Dashboard & Profile
- **SCR-DASH-01: Role-Based Master Dashboard**
  - Route: `/dashboard`
  - Template: `resources/views/pages/support_team/dashboard.blade.php`
  - Components: Metric stat tiles (Total Students, Staff, Classes, Sections, Dorms), Quick Actions shortcuts, Event Noticeboard / Calendar pane.
- **SCR-PROF-01: My Account & Profile Management**
  - Route: `/my_account`
  - Template: `resources/views/pages/support_team/my_account.blade.php`
  - Components: Personal biodata edit form, avatar file dropzone/upload, password alteration form.

## 3. Student Management Screens
- **SCR-STUD-01: Student Admission Form**
  - Route: `/students/create`
  - Template: `resources/views/pages/support_team/students/add.blade.php`
  - Components: Multi-step wizard form (Personal Details, Academic Class/Section, Guardian selection, Dormitory allocation, Passport photo upload).
- **SCR-STUD-02: Class Cohort Student List**
  - Route: `/students/list/{class_id}`
  - Template: `resources/views/pages/support_team/students/list.blade.php`
  - Components: Section tab filters, DataTable of students, Action dropdown (View, Edit, Reset Password, Delete).
- **SCR-STUD-03: Student Profile View**
  - Route: `/students/{id}`
  - Template: `resources/views/pages/support_team/students/show.blade.php`
  - Components: Identity card with avatar, detailed biodata tabs, guardian details, dormitory assignment, quick links to marksheets and fee invoices.
- **SCR-STUD-04: Student Record Editor**
  - Route: `/students/{id}/edit`
  - Template: `resources/views/pages/support_team/students/edit.blade.php`
  - Components: Full record editor, class migration dropdown with warning for mark clearance.
- **SCR-STUD-05: Graduated Students Alumni Directory**
  - Route: `/students/graduated`
  - Template: `resources/views/pages/support_team/students/graduated.blade.php`
  - Components: Class filter, DataTable of alumni with graduation date/session, button to restore (`not_graduated`).
- **SCR-STUD-06: Student Promotion Engine**
  - Route: `/students/promotion`
  - Template: `resources/views/pages/support_team/students/promotion/index.blade.php`
  - Components: Cohort selector (`from_class`, `from_section`, `to_class`, `to_section`), student promotion matrix with radio actions ('Promote', 'Don\'t Promote', 'Graduate').
- **SCR-STUD-07: Promotion History & Rollback**
  - Route: `/students/promotion/manage`
  - Template: `resources/views/pages/support_team/students/promotion/reset.blade.php`
  - Components: Promotion audit table, single rollback action button, "Reset All Promotions" batch button.

## 4. User & Staff Management Screens
- **SCR-USER-01: User Directory & Staff Registration**
  - Route: `/users`
  - Template: `resources/views/pages/support_team/users/index.blade.php`
  - Components: User type filter tabs (Super Admins, Admins, Teachers, Accountants, Librarians, Parents), Create User modal/form, DataTable with actions.
- **SCR-USER-02: User Profile Editor**
  - Route: `/users/{id}/edit`
  - Template: `resources/views/pages/support_team/users/edit.blade.php`
  - Components: User information editor, staff employment date, photo upload.
- **SCR-USER-03: User Profile View**
  - Route: `/users/{id}`
  - Template: `resources/views/pages/support_team/users/show.blade.php`
  - Components: User identity card, contact details, assigned subjects or classes.

## 5. Academic Curriculum Screens
- **SCR-ACAD-01: Class Management**
  - Route: `/classes`
  - Template: `resources/views/pages/support_team/classes/index.blade.php`
  - Components: Class table, Create Class form, Class Type assignment.
- **SCR-ACAD-02: Section Management**
  - Route: `/sections`
  - Template: `resources/views/pages/support_team/sections/index.blade.php`
  - Components: Sections grouped by class, Class Teacher assigner, Active status toggle.
- **SCR-ACAD-03: Subject Management**
  - Route: `/subjects`
  - Template: `resources/views/pages/support_team/subjects/index.blade.php`
  - Components: Subjects grouped by class, Subject Teacher assigner, Add Subject form.

## 6. Examination & Mark Management Screens
- **SCR-EXAM-01: Exam Configuration**
  - Route: `/exams`
  - Template: `resources/views/pages/support_team/exams/index.blade.php`
  - Components: Exam table (Term, Year), Add Exam form.
- **SCR-EXAM-02: Grade Scale Management**
  - Route: `/grades`
  - Template: `resources/views/pages/support_team/grades/index.blade.php`
  - Components: Grade thresholds table (From, To, Letter, Remark), Add Grade form scoped by Class Type.
- **SCR-MARK-01: Mark Entry Selector**
  - Route: `/marks`
  - Template: `resources/views/pages/support_team/marks/index.blade.php`
  - Components: Cascading selector (Exam, Class, Section, Subject).
- **SCR-MARK-02: Subject Score Sheet**
  - Route: `/marks/manage/{exam}/{class}/{sec}/{sub}`
  - Template: `resources/views/pages/support_team/marks/manage.blade.php`
  - Components: Score entry table (`t1`, `t2`, `t3`, `t4`, `exm`), automatic total calculation, Teacher & Principal comment inputs, Skills evaluation modal.
- **SCR-MARK-03: Batch Mark Recalculation Diagnostic**
  - Route: `/marks/batch_fix`
  - Template: `resources/views/pages/support_team/marks/batch_fix.blade.php`
  - Components: Cohort selector, "Recalculate Marks & Positions" trigger.
- **SCR-MARK-04: Master Broad Tabulation Sheet**
  - Route: `/marks/tabulation`
  - Template: `resources/views/pages/support_team/marks/tabulation/index.blade.php`
  - Components: Cross-sectional matrix table (All students vs All subjects), total scores, class average, positions, "Print Tabulation Sheet" button.
- **SCR-MARK-05: Tabulation Sheet Print View**
  - Route: `/marks/tabulation/print/{exam}/{class}/{sec}`
  - Template: `resources/views/pages/support_team/marks/tabulation/print.blade.php`
  - Components: Clean printable landscape broadsheet view.
- **SCR-REP-01: Student Terminal Report Card**
  - Route: `/marks/show/{id}/{year}`
  - Template: `resources/views/pages/support_team/marks/show/index.blade.php`
  - Components: Term selector, detailed assessment breakdown, grades, affective/psychomotor radar, teacher/principal remarks, class rank, next term fees schedule.
- **SCR-REP-02: Printable Report Card**
  - Route: `/marks/print/{id}/{exam_id}/{year}`
  - Template: `resources/views/pages/support_team/marks/print/index.blade.php`
  - Components: Printable branded term marksheet ready for print or PDF export.

## 7. Scratch PIN Management Screens
- **SCR-PIN-01: PIN Inventory**
  - Route: `/pins`
  - Template: `resources/views/pages/support_team/pins/index.blade.php`
  - Components: Counters (Valid PINs, Used PINs), DataTable of scratch PINs, Delete Used PINs action.
- **SCR-PIN-02: Generate PIN Batch**
  - Route: `/pins/create`
  - Template: `resources/views/pages/support_team/pins/create.blade.php`
  - Components: PIN quantity input (max 500 cap enforcement), submit button.
- **SCR-PIN-03: Scratch PIN Entry Voucher**
  - Route: `/pins/enter/{id}`
  - Template: `resources/views/pages/support_team/pins/enter.blade.php`
  - Components: Voucher input modal (`XXXXX-XXXXX-XXXXXX`), submit validation button.

## 8. Financial Management Screens
- **SCR-PAY-01: Fee Master Definitions**
  - Route: `/payments`
  - Template: `resources/views/pages/support_team/payments/index.blade.php`
  - Components: Year selector, Fee list (Title, Amount, Class, Reference Number), Create Fee form.
- **SCR-PAY-02: Cashier Fee Collection**
  - Route: `/payments/manage/{class_id?}`
  - Template: `resources/views/pages/support_team/payments/manage.blade.php`
  - Components: Class selector, Student invoice ledger table, inline payment input (`val-form`), instant AJAX balance decrementing.
- **SCR-PAY-03: Student Invoice Ledger**
  - Route: `/payments/invoice/{id}/{year?}`
  - Template: `resources/views/pages/support_team/payments/invoice.blade.php`
  - Components: Cleared fees table, Uncleared fees table, Pay Now action modals, View Receipts link.
- **SCR-PAY-04: Payment Receipt View**
  - Route: `/payments/receipts/{id}`
  - Template: `resources/views/pages/support_team/payments/receipt.blade.php`
  - Components: Branded cash receipt with school header, student info, payment history table, remaining balance, "Download PDF" button.

## 9. Timetable & Schedule Screens
- **SCR-TIME-01: Timetable Directory**
  - Route: `/timetables`
  - Template: `resources/views/pages/support_team/timetables/index.blade.php`
  - Components: Timetable list (Routine and Exam), Create Timetable form.
- **SCR-TIME-02: Schedule Grid Matrix Editor**
  - Route: `/timetables/records/manage/{ttr}`
  - Template: `resources/views/pages/support_team/timetables/manage.blade.php`
  - Components: Day columns, Time Slot rows, Subject drag/assignment cells, Time Slot creator modal, "Use Existing Slots" clone modal.
- **SCR-TIME-03: Schedule Viewer & Printable View**
  - Route: `/timetables/records/show/{ttr}`, `/timetables/records/print/{ttr}`
  - Template: `resources/views/pages/support_team/timetables/show.blade.php`
  - Components: Formatted weekly schedule view with print stylesheet.

## 10. Dormitories & Hostels
- **SCR-DORM-01: Hostel Management**
  - Route: `/dorms`
  - Template: `resources/views/pages/support_team/dorms/index.blade.php`
  - Components: Dormitory list, Add Dormitory form, Edit Dormitory view.

## 11. Parent & System Settings Screens
- **SCR-PAR-01: Parent Ward Portal**
  - Route: `/my_children`
  - Template: `resources/views/pages/parent/children.blade.php`
  - Components: Cards for each enrolled child, links to Marksheet, Timetable, Payments.
- **SCR-SETT-01: Super Admin System Settings**
  - Route: `/super_admin/settings`
  - Template: `resources/views/pages/super_admin/settings.blade.php`
  - Components: Academic session string, Term start/end datepickers, School contact details, Exam Lock toggle, Next Term Fee schedules per Class Type, School logo file uploader.
