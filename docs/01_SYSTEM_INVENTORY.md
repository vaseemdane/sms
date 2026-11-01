# System Inventory: LAV_SMS (Laravel School Management System)

## 1. Application Architecture
- **Paradigm**: Monolithic MVC (Model-View-Controller) with Repository Pattern and Helper-driven business logic.
- **Framework**: Laravel Framework 8.40 (PHP 7.2 - 8.0 support).
- **Frontend Architecture**: Blade Templating Engine + Bootstrap 4 + Limitless Admin Template Theme + jQuery + AJAX Form Interceptors + SweetAlert + PNotify + DataTables.
- **Backend Architecture**: Layered architecture:
  - Routing: `routes/web.php` (Primary monolith), `routes/api.php` (Default single route), `routes/channels.php`, `routes/console.php`.
  - Controllers: `app/Http/Controllers/...`
  - Repositories: `app/Repositories/...` (UserRepo, StudentRepo, MyClassRepo, ExamRepo, MarkRepo, PaymentRepo, PinRepo, TimeTableRepo, DormRepo, SettingRepo, LocationRepo).
  - Helpers: `app/Helpers/Qs.php` (System-wide general utilities, role checks, paths, session settings), `app/Helpers/Mk.php` (Marks, grading, positions, rankings, exam locking), `app/Helpers/Pay.php` (Payment reference numbers, year pluckers).
  - Models: Eloquent ORM in `app/Models` (28 models) and `app/User.php`.
  - Database: MySQL / MariaDB (configurable via `config/database.php`).

## 2. PHP Version & Core Environment
- **PHP Version**: Target ^7.2 || ^8.0.
- **Framework Version**: `laravel/framework: ^8.40`.
- **Composer Dependencies**:
  - `barryvdh/laravel-dompdf`: PDF rendering for student report cards / marksheets and payment receipts.
  - `hashids/hashids`: ID obfuscation/encryption for sensitive IDs in URLs.
  - `guzzlehttp/guzzle`: HTTP client.
  - `laravel/ui`: Authentication scaffolding (Bootstrap preset).
  - `fruitcake/laravel-cors`: CORS handling.
  - `fideloper/proxy`: Trusted proxy header handling.

## 3. Entry Points & Routing Surface
- **Web Entry**: `public/index.php` -> `bootstrap/app.php` -> `routes/web.php`.
- **Console Entry**: `artisan` -> `app/Console/Kernel.php`.
- **Public Routes**:
  - `/login` [GET/POST]: Authentication.
  - `/password/reset`, `/password/email`: Password recovery.
  - `/privacy-policy`, `/terms-of-use`: Static institutional policies.
- **Protected User Routes**:
  - Dashboard: `/dashboard`
  - Profile & Account: `/my_account`, `/my_account/change_password`
- **Support Team Management Routes**:
  - Students: `/students`, `/students/list/{class_id}`, `/students/graduated`, promotion management.
  - Users: `/users`, `/users/reset_pass/{id}`
  - Classes & Sections: `/classes`, `/sections`
  - Subjects: `/subjects`
  - Exams & Grades: `/exams`, `/grades`
  - Marks: `/marks`, `/marks/manage`, `/marks/bulk`, `/marks/tabulation`, print & batch fix.
  - Timetables: `/timetables`, `/timetables/records`, `/timetables/time_slots`
  - Payments: `/payments`, `/payments/invoice`, `/payments/receipts`, `/payments/pdf_receipts`
  - Pins: `/pins`, `/pins/create`, `/pins/enter`, `/pins/verify`
  - Dormitories: `/dorms`
  - Super Admin System Settings: `/super_admin/settings`
  - Parent Portal: `/my_children`
  - AJAX Endpoints: `/ajax/get_lga/{state_id}`, `/ajax/get_class_sections/{class_id}`, `/ajax/get_class_subjects/{class_id}`.

## 4. User Roles & Personas
The system defines 7 functional user types with hierarchical access levels (`user_types` table):
1. **super_admin** (Level 1): Full institutional control, destructive deletion authorization, system settings, global PIN management, master user creation.
2. **admin** (Level 2): Academic and administrative management, student record CRUD, fee oversight, timetable scheduling, class creation.
3. **teacher** (Level 3): Class & subject oversight, score & mark entry for allocated subjects, timetable viewing.
4. **parent** (Level 4): Parent portal, view children's report cards, download PDF marksheets, inspect fee obligations & invoices.
5. **accountant** (Level 5): Fee invoice tracking, recording fee receipts, payment management.
6. **librarian** (Level 6): Scaffolded book cataloging & library book requests (stubbed in controller, ready for modern activation).
7. **student** (Level 7): Student dashboard, subject viewing, grade/marksheet inspection (guarded by exam lock & scratch PIN verification), timetable inspection.

## 5. Background Jobs & Scheduled Tasks
- Currently, `app/Console/Kernel.php` defines no scheduled cron jobs (only standard Laravel schedule placeholder).
- No message queue workers are configured (`QUEUE_CONNECTION=sync`).
- Mark tabulation, report card generation, batch mark fixes, and session promotions run synchronously during HTTP requests.

## 6. Storage & File System
- **Driver**: Local disk (`storage/app/public`).
- **Public Symlink**: `public/storage` points to `storage/app/public`.
- **Upload Directory Paths**:
  - `uploads/student/{student_code}/photo.{ext}`
  - `uploads/{user_type}/{user_code}/photo.{ext}`
  - `uploads/logo.{ext}` (School crest/logo)
- File metadata parsing is handled via `Qs::getFileMetaData()`.

## 7. Integrations & External Services
- **Barryvdh DomPDF**: Local server-side HTML-to-PDF compilation for payment receipts and student report cards.
- **Hashids**: Reversible symmetric integer hashing (`Qs::hash()`, `Qs::decodeHash()`) for URL parameter obfuscation using salt and date tokens.
- **No External SMS / Email Gateways Configured**: Email settings exist in `settings` table (`system_email`, `email_host`, `email_pass`) but rely on standard Laravel SwiftMailer/Mail drivers without external webhooks or third-party SMS providers active.
