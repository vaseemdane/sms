# Phased Migration Plan: LAV_SMS Modern Rebuild

## 1. Migration Roadmap

The rebuild is broken into **7 independently verifiable phases** to ensure zero regression, continuous validation, and absolute behavioral parity:

```
[Phase 1: Foundation & Auth] ──> [Phase 2: Academic Core] ──> [Phase 3: Student Management]
                                                                        │
[Phase 6: Finance & Pin]     <── [Phase 5: Timetables]    <── [Phase 4: Examination & Marks]
            │
            v
[Phase 7: End-to-End Verification & Parity Audit]
```

---

### Phase 1: Foundation, Infrastructure & Identity
- **Objective**: Establish project repository, modern tech stack, database schema, authentication, and core RBAC.
- **Tasks**:
  1. Initialize Next.js 14+ / React 19 TypeScript project with Tailwind CSS & shadcn/ui.
  2. Configure PostgreSQL 16 database and Prisma/Drizzle ORM.
  3. Migrate schema: `users`, `user_types`, `states`, `lgas`, `nationalities`, `blood_groups`, `settings`.
  4. Seed default system data (Nigeria states, LGAs, blood groups, user types, system settings).
  5. Implement multi-identifier authentication (`email` or `username`).
  6. Implement RBAC authorization middleware and session management.
- **Verification**: Unit tests for password hashing; API tests for dual login, role redirects, and protected route access.

---

### Phase 2: Academic Infrastructure & Curriculum
- **Objective**: Implement educational tiers, classes, sections, and subjects.
- **Tasks**:
  1. Implement schema: `class_types`, `my_classes`, `sections`, `subjects`, `dorms`.
  2. Implement Class CRUD with Class Type association.
  3. Implement Section / Arm management with Class Teacher assignment.
  4. Implement Subject management with Class and Subject Teacher assignment.
  5. Implement cascading AJAX API endpoints (`/api/v1/academics/classes/:id/sections`, etc.).
  6. Build reactive UI for academic administration.
- **Verification**: CRUD integration tests; teacher deletion guard when subjects are assigned.

---

### Phase 3: Student Lifecycle & User Administration
- **Objective**: Implement student admission, alumni graduation, user management, and cohort promotions.
- **Tasks**:
  1. Implement schema: `student_records`, `staff_records`, `promotions`.
  2. Build multi-step student admission wizard with photo upload to S3.
  3. Implement deterministic admission number and staff ID generator.
  4. Implement graduation and un-graduation workflows.
  5. Implement cohort promotion engine ('P', 'D', 'G') and promotion history rollback.
  6. Implement class migration mark cleanup logic (`deleteOldRecord`).
- **Verification**: Admission number format parity test; promotion rollback test.

---

### Phase 4: Examinations, Continuous Assessment & Marksheets
- **Objective**: Implement exam terms, grade thresholds, mark entry, batch diagnostic recalculations, broadsheets, and report cards.
- **Tasks**:
  1. Implement schema: `exams`, `grades`, `skills`, `marks`, `exam_records`.
  2. Build assessment entry grid for teachers with score boundaries.
  3. Implement grade scale resolver (class-type scoped with universal fallback).
  4. Implement terminal & cumulative average calculations and cohort rank calculations with ordinal suffixes.
  5. Implement master broadsheet tabulation sheet (screen + print view).
  6. Build interactive student terminal report card with affective/psychomotor ratings.
- **Verification**: Grade scale boundary tests; rank order parity test; cumulative term 3 calculations test.

---

### Phase 5: Timetable & Scheduling
- **Objective**: Routine and exam schedule builders with time slot duplication.
- **Tasks**:
  1. Implement schema: `time_table_records`, `time_slots`, `time_tables`.
  2. Build timetable matrix editor with time slot generation.
  3. Implement slot duplication across classes (`use_time_slot`).
  4. Build responsive weekly schedule viewer with print stylesheet.
- **Verification**: Timetable slot collision tests; print view rendering.

---

### Phase 6: Finance, Invoicing & Scratch Card PIN Engine
- **Objective**: Fee definitions, cashier ledger, partial cash payments, PDF receipt generation, and scratch card vouchers.
- **Tasks**:
  1. Implement schema: `payments`, `payment_records`, `receipts`, `pins`.
  2. Implement master fee definition with automatic invoice distribution to enrolled students.
  3. Build cashier fee payment ledger with live balance updates and ACID transactions.
  4. Implement PDF receipt generation with Playwright / @react-pdf/renderer.
  5. Implement 16-character scratch PIN generator with 500-batch ceiling.
  6. Implement PIN redemption validator (5 usage cycles, student locking).
  7. Implement `lock_exam` interceptor guarding report card views.
- **Verification**: Concurrent cashier payment tests; PIN redemption limit and student lock tests.

---

### Phase 7: Parent Portal, Final Security Hardening & Parity Verification
- **Objective**: Multi-ward parent portal, system settings, security audits, and final parity audit.
- **Tasks**:
  1. Build multi-child parent portal view (`/parent/wards`).
  2. Implement Super Admin system settings dashboard (dates, fees, logo upload).
  3. Run comprehensive end-to-end regression test suite.
  4. Verify complete parity against `docs/28_PARITY_CHECKLIST.md`.
- **Verification**: Full manual and automated sign-off.
