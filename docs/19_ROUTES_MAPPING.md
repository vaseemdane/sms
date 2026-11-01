# Route Mapping Specification: LAV_SMS

## 1. Route Comparison Table

| Legacy Route (Blade/Laravel) | Proposed Modern Route (Next.js/React) | Component / View Purpose | Allowed Roles |
|---|---|---|---|
| `/login` | `/auth/login` | User login form | Guest |
| `/password/reset` | `/auth/forgot-password` | Request password reset token | Guest |
| `/password/reset/{token}` | `/auth/reset-password` | Submit new password | Guest |
| `/dashboard` | `/dashboard` | Main role dashboard | All Authenticated |
| `/my_account` | `/settings/profile` | Personal profile & avatar editor | All Authenticated |
| `/students/create` | `/students/new` | Multi-step admission wizard | super_admin, admin |
| `/students/list/{class_id}` | `/classes/:classId/students` | Class cohort directory | super_admin, admin, teacher |
| `/students/{id}` | `/students/:id` | Student overview & details | super_admin, admin, teacher, parent, student |
| `/students/{id}/edit` | `/students/:id/edit` | Edit student biodata & enrollment | super_admin, admin |
| `/students/graduated` | `/students/graduated` | Alumni records list | super_admin, admin |
| `/students/promotion` | `/students/promotions` | Cohort promotion matrix | super_admin, admin |
| `/students/promotion/manage` | `/students/promotions/history` | Promotion rollback management | super_admin, admin |
| `/users` | `/users` | Staff & User administration | super_admin, admin |
| `/users/{id}/edit` | `/users/:id/edit` | Edit user profile | super_admin, admin |
| `/classes` | `/academics/classes` | Class management | super_admin, admin |
| `/sections` | `/academics/sections` | Section / Arm management | super_admin, admin |
| `/subjects` | `/academics/subjects` | Curriculum subject management | super_admin, admin |
| `/exams` | `/academics/exams` | Exam terms & sessions setup | super_admin, admin |
| `/grades` | `/academics/grades` | Grade scale thresholds | super_admin, admin |
| `/marks` | `/examinations/marks` | Assessment selector & overview | super_admin, admin, teacher |
| `/marks/manage/{ex}/{cl}/{sec}/{sub}` | `/examinations/marks/entry` | Live subject score sheet | super_admin, admin, teacher |
| `/marks/batch_fix` | `/examinations/diagnostics` | Recalculate cohort marks | super_admin, admin |
| `/marks/tabulation` | `/examinations/tabulation` | Master broadsheet tabulation | super_admin, admin |
| `/marks/tabulation/print/...` | `/examinations/tabulation/print` | Printable broadsheet view | super_admin, admin |
| `/marks/show/{id}/{year}` | `/students/:id/report-card` | Term report card (PIN check) | All authorized |
| `/marks/print/{id}/{ex}/{year}` | `/students/:id/report-card/print` | Printable term report card | All authorized |
| `/pins` | `/pins` | Scratch card PIN inventory | super_admin, admin |
| `/pins/create` | `/pins/generate` | Batch PIN generator | super_admin, admin |
| `/pins/enter/{id}` | `/pins/redeem/:studentId` | Voucher redemption screen | student, parent |
| `/payments` | `/finance/fees` | Master fee items definition | super_admin, admin, accountant |
| `/payments/manage/{class_id?}` | `/finance/cashier` | Cashier fee collection ledger | super_admin, admin, accountant |
| `/payments/invoice/{id}` | `/finance/invoices/:studentId` | Student invoice ledger | super_admin, admin, accountant, student, parent |
| `/payments/receipts/{id}` | `/finance/receipts/:id` | View payment receipt | super_admin, admin, accountant, student, parent |
| `/timetables` | `/academics/timetables` | Timetables overview | All authorized |
| `/timetables/records/manage/{ttr}` | `/academics/timetables/:id/builder` | Timetable grid editor | super_admin, admin |
| `/dorms` | `/hostels` | Dormitory management | super_admin, admin |
| `/my_children` | `/parent/wards` | Multi-child parent portal | parent |
| `/super_admin/settings` | `/settings/institution` | Global school parameters | super_admin |
| `/privacy-policy` | `/legal/privacy` | Privacy policy disclosure | Public |
| `/terms-of-use` | `/legal/terms` | Terms of service | Public |
