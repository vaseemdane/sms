# Database Analysis: LAV_SMS

## 1. Relational Topology & Entity Overview
The database layer consists of **28 functional tables** engineered for a multi-tiered school management system in standard 3NF relational design:

```
[States] <--(1:N)-- [Lgas]
   ^                  ^
   |                  |
[Nationalities]  [BloodGroups]
   ^                  ^
   \--------+---------/
            |
            v
         [Users] <====================================+======================+
          |   ^                                       |                      |
    (1:1) |   | (Parent: my_parent_id)          (1:N) |                (1:N) |
          v   |                                       v                      v
   [StaffRecords] [StudentRecords]               [BookRequests]            [Pins]
          |              |                            ^                      |
          |        (M:1) | (dorm_id)                  |                      |
          |              v                            |                      |
          |           [Dorms]                     [Books]                    |
          |                                           |                      |
          +-----------------------+                   | (my_class_id)        |
                                  |                   v                      |
                                  +------------> [MyClasses] <---------------+
                                                  ^   ^   ^
                                   (class_type_id)|   |   | (my_class_id)
                                                  |   |   |
                                       [ClassTypes]   |   +---> [Sections]
                                           ^          |              ^
                                           |          +---> [Subjects]
                                           |                     |
                                           v                     v
                                        [Grades]              [Marks] <--(exam_id)-- [Exams]
                                                                 |                     |
                                                                 v                     v
                                                          [ExamRecords] <==============+
                                                                 |
                                                          [Promotions]
```

## 2. Table Classification
1. **System & Reference Tables**:
   - `blood_groups`: Master blood types (A+, A-, B+, B-, AB+, AB-, O+, O-).
   - `nationalities`: Country records (default Nigeria).
   - `states`: Nigerian federal states (36 states + FCT).
   - `lgas`: Local Government Areas partitioned by state.
   - `user_types`: System roles (super_admin, admin, teacher, parent, accountant, librarian, student) with hierarchical security `level`.
   - `class_types`: Educational stages (`code` in C, PN, N, P, J, S).
   - `settings`: Key-value application parameters (e.g., current session, lock_exam toggle, school branding, fee defaults).

2. **Core Academic Structure**:
   - `my_classes`: Classes (e.g., JSS 1, Primary 3) referencing `class_types`.
   - `sections`: Sub-class arms/sections (e.g., Diamond, Gold) assigned to a class teacher user.
   - `subjects`: Academic subjects assigned to a class and designated teacher user.
   - `dorms`: Boarding house accommodations.

3. **Users & Profiles**:
   - `users`: Core identity table with authentication credentials, contact details, polymorphic references.
   - `staff_records`: Employment information for staff users (emp_date, code).
   - `student_records`: Academic enrollment details (adm_no, class, section, parent user_id, dorm, session, graduation status).
   - `password_resets`: Email token storage for password recovery.

4. **Examinations, Marks & Assessment**:
   - `exams`: Exam sessions defined by term (1, 2, 3) and academic session year.
   - `grades`: Grading thresholds (mark_from, mark_to, points, remark) optionally scoped by class type.
   - `marks`: Granular score sheets per student, subject, and exam. Stores continuous assessments (`t1`, `t2`, `t3`, `t4`), test continuous assessment (`tca`), terminal exam score (`exm`), term totals (`tex1`, `tex2`, `tex3`), and cumulative average (`cum`).
   - `exam_records`: Aggregated performance per student, exam, class, section. Stores overall total, average (`ave`), class rank (`pos`), behavioral skill scores, and teacher/principal remarks.
   - `skills`: Behavioral assessment parameters (Affective / Psychomotor).
   - `promotions`: Session-to-session transition logs recording promotion status ('P', 'D', 'G'), source/destination classes, and sessions.

5. **Security & Access Control Tokens**:
   - `pins`: Scratch card vouchers with random generated tokens, usage counters (max 5 cycles), student locking, and validation flags.

6. **Scheduling & Timetable**:
   - `time_table_records`: Timetable definitions for a class/exam combination.
   - `time_slots`: Time windows (time_from, time_to) scoped to a timetable record.
   - `time_tables`: Scheduled subject allocations per day or exam date.

7. **Finance & Billing**:
   - `payments`: Fee items defined per class and academic year.
   - `payment_records`: Student invoices tracking required amount (`amt`), amount paid (`amt_paid`), balance (`balance`), and clearance flag (`paid`).
   - `receipts`: Historical payment receipts tracking partial/full cash receipts with unique ref_no.

8. **Library Stubs**:
   - `books`: Library books cataloged by class, author, location, ISBN.
   - `book_requests`: Book borrowing requests logged by user.
