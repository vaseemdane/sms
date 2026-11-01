# Role-Based Access Control (RBAC) Matrix: LAV_SMS

## 1. Middleware Groups & Hierarchy

The application defines security groups mapped in `app/Helpers/Qs.php` and enforced by custom middleware in `app/Http/Middleware/Custom`:

- **`super_admin`** (`SuperAdmin.php`): Only users with `user_type == 'super_admin'`.
- **`teamSA`** (`TeamSA.php`): `['super_admin', 'admin']` (Super Admin + Admin).
- **`teamAccount`** (`TeamAccount.php`): `['super_admin', 'admin', 'accountant']`.
- **`teamSAT`** (`TeamSAT.php`): `['super_admin', 'admin', 'teacher']`.
- **`my_parent`** (`MyParent.php`): `user_type == 'parent'`.
- **`student`** (`Student.php`): `user_type == 'student'`.
- **`examIsLocked`** (`ExamIsLocked.php`): Verifies if system setting `lock_exam == 1`. If locked, students/parents are intercepted and required to enter a valid scratch PIN before viewing results.

## 2. Global RBAC Permission Matrix

| Capability / Resource | super_admin | admin | teacher | accountant | librarian | parent | student |
|---|---|---|---|---|---|---|---|
| **System Settings (`/super_admin/settings`)** | **CRUD** | - | - | - | - | - | - |
| **Manage Staff / Users (`/users`)** | **CRUD** | **CRUD** (Level > 2) | - | - | - | - | - |
| **Head SA Protection (`Qs::headSA`)** | Protected | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked |
| **Delete User / Student Records** | **YES** | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked |
| **Reset Staff Passwords** | **YES** | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked |
| **Reset Student Passwords** | **YES** | **YES** | - | - | - | - | - |
| **Create / Edit Student Records** | **YES** | **YES** | - | - | - | - | - |
| **View Student Profile** | **YES** | **YES** | **YES** | - | - | Own Wards Only | Own Profile Only |
| **Student Promotions / Rollbacks** | **YES** | **YES** | - | - | - | - | - |
| **Academic Structure (Classes, Sections, Subjects)** | **CRUD** | **CRUD** | View (Allocated) | - | - | - | - |
| **Exam & Grade Scale Definition** | **CRUD** | **CRUD** | - | - | - | - | - |
| **Mark Entry / Subject Marks** | **CRUD** | **CRUD** | Allocated Subjects | - | - | - | - |
| **Batch Mark Fixes / Tabulation Sheets** | **YES** | **YES** | - | - | - | - | - |
| **View / Print Student Marksheet** | **YES** | **YES** | **YES** | - | - | Own Wards (PIN if locked) | Own Record (PIN if locked) |
| **Scratch PIN Generation & Management** | **CRUD** | **CRUD** | - | - | - | - | - |
| **Timetable Scheduling & Time Slots** | **CRUD** | **CRUD** | View / Print | - | - | View / Print | View / Print |
| **Fee Definitions & Student Invoices** | **CRUD** | **CRUD** | - | **CRUD** | - | View (Wards) | View (Own) |
| **Record Cash Fee Payments & Issue Receipts** | **YES** | **YES** | - | **YES** | - | - | - |
| **Print / Download Payment Receipts** | **YES** | **YES** | - | **YES** | - | Own Wards | Own Receipts |
| **Dormitories / Hostels** | **CRUD** | **CRUD** | - | - | - | - | - |
| **Parent Portal (`/my_children`)** | - | - | - | - | - | **YES** | - |
| **Personal Profile & Self Password Change** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** | **YES** |

## 3. Row-Level Data Restrictions (Ownership Checks)
1. **Teacher Mark Access**: Teachers can only view and submit mark records for subjects where `teacher_id == Auth::user()->id`.
2. **Student Isolation**: A student can only view their own user profile, exam marksheet, payments, and timetable. Attempts to query another student ID redirect with `msg.denied`.
3. **Parent Isolation**: A parent can only view the marksheets and fee invoices of students who match `student_records.my_parent_id == Auth::user()->id` via `Qs::userIsMyChild()`.
4. **Head Super Admin Immobility**: The user with ID `1` (`Qs::headSA()`) cannot be edited, deleted, or have their password forcibly reset by any other administrative account.
