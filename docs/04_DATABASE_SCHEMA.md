# Complete Database Schema Specification: LAV_SMS

## 1. Tables & Column Definitions

### 1. `blood_groups`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | E.g., 'A+', 'O+' |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 2. `states`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | State name |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 3. `lgas`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | LGA name |
| `state_id` | INT UNSIGNED | NO | - | FK -> `states.id` ON DELETE CASCADE | Parent State |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 4. `nationalities`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | Country name |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 5. `user_types`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `title` | VARCHAR(100) | NO | - | UNIQUE | System role key |
| `name` | VARCHAR(100) | NO | - | - | Display label |
| `level` | TINYINT UNSIGNED | NO | - | - | Authorization level (1=Super Admin, 7=Student) |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 6. `class_types`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | Stage name (e.g. Nursery, Junior) |
| `code` | VARCHAR(100) | YES | NULL | UNIQUE | Short code (C, PN, N, P, J, S) |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 7. `users`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | Full name |
| `email` | VARCHAR(100) | YES | NULL | UNIQUE | Email address |
| `code` | VARCHAR(100) | NO | - | UNIQUE | Alphanumeric token (avatar directory key) |
| `username` | VARCHAR(100) | YES | NULL | UNIQUE | Login username |
| `user_type` | VARCHAR(100) | YES | NULL | - | Role key (e.g., 'super_admin') |
| `dob` | VARCHAR(100) | YES | NULL | - | Date of birth string |
| `gender` | VARCHAR(100) | YES | NULL | - | 'Male', 'Female' |
| `photo` | VARCHAR(100) | NO | 'user.png' | - | Avatar URL/path |
| `phone` | VARCHAR(100) | YES | NULL | - | Primary telephone |
| `phone2` | VARCHAR(100) | YES | NULL | - | Secondary telephone |
| `bg_id` | INT UNSIGNED | YES | NULL | FK -> `blood_groups.id` ON DELETE SET NULL | Blood Group |
| `state_id` | INT UNSIGNED | YES | NULL | FK -> `states.id` ON DELETE SET NULL | State of origin |
| `lga_id` | INT UNSIGNED | YES | NULL | FK -> `lgas.id` ON DELETE SET NULL | LGA of origin |
| `nal_id` | INT UNSIGNED | YES | NULL | FK -> `nationalities.id` ON DELETE SET NULL | Nationality |
| `address` | VARCHAR(100) | YES | NULL | - | Residential street address |
| `email_verified_at` | TIMESTAMP | YES | NULL | - | Verification timestamp |
| `password` | VARCHAR(100) | NO | - | - | Bcrypt hash |
| `remember_token` | VARCHAR(100) | YES | NULL | - | Remember token |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 8. `my_classes`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | E.g. 'JSS 1', 'Primary 2' |
| `class_type_id` | INT UNSIGNED | YES | NULL | FK -> `class_types.id` ON DELETE SET NULL | Educational tier |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 9. `sections`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | Arm name (e.g., 'A', 'Gold') |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Associated Class |
| `teacher_id` | INT UNSIGNED | YES | NULL | FK -> `users.id` ON DELETE SET NULL | Assigned Form Teacher |
| `active` | TINYINT(1) | NO | 0 | - | Active toggle flag |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`name`, `my_class_id`) | Unique per class |

### 10. `subjects`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | Subject title |
| `slug` | VARCHAR(100) | YES | NULL | - | URL slug |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Target Class |
| `teacher_id` | INT UNSIGNED | NO | - | FK -> `users.id` | Subject Teacher |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`name`, `my_class_id`) | Unique subject per class |

### 11. `dorms`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | Hostel / Dorm name |
| `description` | VARCHAR(100) | YES | NULL | - | Details |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 12. `student_records`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `user_id` | INT UNSIGNED | NO | - | FK -> `users.id` ON DELETE CASCADE | Associated User |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Current Class |
| `section_id` | INT UNSIGNED | NO | - | FK -> `sections.id` ON DELETE CASCADE | Current Section |
| `session` | VARCHAR(100) | NO | - | - | Academic Year (e.g. '2018-2019') |
| `age` | INT UNSIGNED | YES | NULL | - | Age in years |
| `my_parent_id` | INT UNSIGNED | YES | NULL | FK -> `users.id` ON DELETE SET NULL | Guardian User ID |
| `dorm_id` | INT UNSIGNED | YES | NULL | FK -> `dorms.id` ON DELETE SET NULL | Allocated Dormitory |
| `dorm_room_no` | VARCHAR(100) | YES | NULL | - | Hostel room number |
| `adm_no` | VARCHAR(30) | YES | NULL | UNIQUE | Admission Number |
| `year_admitted` | VARCHAR(100) | YES | NULL | - | Year admitted |
| `house` | VARCHAR(100) | YES | NULL | - | Sport house |
| `grad` | TINYINT(1) | NO | 0 | - | Graduation status (1=Graduated) |
| `grad_date` | VARCHAR(100) | YES | NULL | - | Graduation session |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 13. `staff_records`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `user_id` | INT UNSIGNED | NO | - | UNIQUE, FK -> `users.id` ON DELETE CASCADE | Staff User |
| `code` | VARCHAR(100) | YES | NULL | UNIQUE | Staff identifier |
| `emp_date` | VARCHAR(255) | YES | NULL | - | Employment date string |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 14. `settings`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `type` | VARCHAR(100) | NO | - | UNIQUE | Configuration key |
| `description` | VARCHAR(100) | YES | NULL | - | Configuration string value |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 15. `exams`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | Exam title |
| `term` | TINYINT UNSIGNED | NO | - | - | Term number (1, 2, or 3) |
| `year` | VARCHAR(100) | NO | - | - | Academic session string |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`term`, `year`) | One exam per term per year |

### 16. `grades`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(40) | NO | - | - | Grade letter (A, B, C, D, E, F) |
| `class_type_id` | INT UNSIGNED | YES | NULL | FK -> `class_types.id` ON DELETE CASCADE | Optional Class Type scope |
| `mark_from` | TINYINT UNSIGNED | NO | - | - | Lower percentage boundary |
| `mark_to` | TINYINT UNSIGNED | NO | - | - | Upper percentage boundary |
| `remark` | VARCHAR(40) | YES | NULL | - | E.g. 'Distinction', 'Credit' |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 17. `marks`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `student_id` | INT UNSIGNED | NO | - | FK -> `users.id` ON DELETE CASCADE | Student user ID |
| `subject_id` | INT UNSIGNED | NO | - | FK -> `subjects.id` ON DELETE CASCADE | Subject ID |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Class ID |
| `section_id` | INT UNSIGNED | NO | - | FK -> `sections.id` ON DELETE CASCADE | Section ID |
| `exam_id` | INT UNSIGNED | NO | - | FK -> `exams.id` ON DELETE CASCADE | Exam ID |
| `t1` | INT | YES | NULL | - | Assessment 1 |
| `t2` | INT | YES | NULL | - | Assessment 2 |
| `t3` | INT | YES | NULL | - | Assessment 3 |
| `t4` | INT | YES | NULL | - | Assessment 4 |
| `tca` | INT | YES | NULL | - | Total Continuous Assessment |
| `exm` | INT | YES | NULL | - | Final Exam Score |
| `tex1` | INT | YES | NULL | - | Term 1 Final Score |
| `tex2` | INT | YES | NULL | - | Term 2 Final Score |
| `tex3` | INT | YES | NULL | - | Term 3 Final Score |
| `cum` | VARCHAR(100) | YES | NULL | - | Cumulative Total/Average |
| `cum_ave` | VARCHAR(100) | YES | NULL | - | Cumulative Average Score |
| `grade_id` | INT UNSIGNED | YES | NULL | FK -> `grades.id` ON DELETE SET NULL | Mapped Grade ID |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `sub_pos` | VARCHAR(100) | YES | NULL | - | Subject ranking in section/class |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`student_id`, `subject_id`, `exam_id`, `year`) | Unique score entry per student/sub/exam |

### 18. `exam_records`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `exam_id` | INT UNSIGNED | NO | - | FK -> `exams.id` ON DELETE CASCADE | Exam ID |
| `student_id` | INT UNSIGNED | NO | - | FK -> `users.id` ON DELETE CASCADE | Student user ID |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Class ID |
| `section_id` | INT UNSIGNED | NO | - | FK -> `sections.id` ON DELETE CASCADE | Section ID |
| `total` | INT | YES | NULL | - | Sum total of term scores |
| `ave` | VARCHAR(100) | YES | NULL | - | Overall term average score |
| `class_ave` | VARCHAR(100) | YES | NULL | - | Cohort average score |
| `pos` | INT | YES | NULL | - | Overall class rank position |
| `af` | VARCHAR(100) | YES | NULL | - | Affective skills comma list/JSON |
| `ps` | VARCHAR(100) | YES | NULL | - | Psychomotor skills comma list/JSON |
| `p_comment` | VARCHAR(100) | YES | NULL | - | Principal remark |
| `t_comment` | VARCHAR(100) | YES | NULL | - | Form teacher remark |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`exam_id`, `student_id`, `year`) | Unique student record per exam |

### 19. `skills`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | - | Skill name (e.g. 'Punctuality', 'Handwriting') |
| `skill_type` | VARCHAR(100) | YES | NULL | - | 'affective' or 'psychomotor' |
| `class_type_id` | INT UNSIGNED | YES | NULL | - | Scoped class type |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 20. `pins`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `code` | VARCHAR(40) | NO | - | UNIQUE | Scratch pin voucher token |
| `used` | TINYINT UNSIGNED | NO | 0 | - | Redemption flag (1=redeemed) |
| `times_used` | TINYINT UNSIGNED | NO | 0 | - | Access count (max 5) |
| `user_id` | INT UNSIGNED | YES | NULL | FK -> `users.id` ON DELETE CASCADE | User who redeemed |
| `student_id` | INT UNSIGNED | YES | NULL | FK -> `users.id` ON DELETE CASCADE | Locked student record |
| `user_type` | VARCHAR(100) | YES | NULL | - | Role of redeemer |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 21. `promotions`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `student_id` | INT UNSIGNED | NO | - | FK -> `users.id` ON DELETE CASCADE | Student user ID |
| `from_class` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Origin class |
| `from_section` | INT UNSIGNED | NO | - | FK -> `sections.id` ON DELETE CASCADE | Origin section |
| `to_class` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Target class |
| `to_section` | INT UNSIGNED | NO | - | FK -> `sections.id` ON DELETE CASCADE | Target section |
| `grad` | TINYINT(1) | NO | 0 | - | 1 if graduated |
| `from_session` | VARCHAR(100) | NO | - | - | Origin academic session |
| `to_session` | VARCHAR(100) | NO | - | - | Destination academic session |
| `status` | VARCHAR(100) | NO | - | - | 'P' (Promoted), 'D' (Retained), 'G' (Graduated) |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 22. `payments`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `title` | VARCHAR(100) | NO | - | - | Fee item title |
| `amount` | INT | NO | - | - | Required amount |
| `my_class_id` | INT UNSIGNED | YES | NULL | FK -> `my_classes.id` ON DELETE CASCADE | Target class (null for general) |
| `description` | VARCHAR(100) | YES | NULL | - | Fee description |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `ref_no` | VARCHAR(100) | YES | NULL | UNIQUE | Fee master ref code |
| `method` | VARCHAR(100) | YES | NULL | - | Payment method default |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 23. `payment_records`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `payment_id` | INT UNSIGNED | NO | - | FK -> `payments.id` ON DELETE CASCADE | Master fee item |
| `student_id` | INT UNSIGNED | NO | - | FK -> `users.id` ON DELETE CASCADE | Student user ID |
| `ref_no` | VARCHAR(100) | YES | NULL | UNIQUE | Invoice tracking number |
| `amt_paid` | INT | YES | NULL | - | Cumulative amount paid |
| `balance` | INT | YES | NULL | - | Remaining balance |
| `paid` | TINYINT(1) | NO | 0 | - | 1 if fully settled |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 24. `receipts`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `pr_id` | INT UNSIGNED | NO | - | FK -> `payment_records.id` ON DELETE CASCADE | Invoice record ID |
| `amt_paid` | INT | NO | - | - | Cash instalment amount |
| `balance` | INT | NO | - | - | Balance at time of payment |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | - | Timestamp |

### 25. `time_table_records`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `name` | VARCHAR(100) | NO | - | UNIQUE | Timetable title |
| `my_class_id` | INT UNSIGNED | NO | - | FK -> `my_classes.id` ON DELETE CASCADE | Class ID |
| `exam_id` | INT UNSIGNED | YES | NULL | FK -> `exams.id` ON DELETE CASCADE | Optional Exam ID (null for Routine) |
| `year` | VARCHAR(100) | NO | - | - | Academic session |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`my_class_id`, `exam_id`, `year`) | One timetable per class/exam/year |

### 26. `time_slots`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `ttr_id` | INT UNSIGNED | NO | - | FK -> `time_table_records.id` ON DELETE CASCADE | Parent Timetable Record |
| `hour_from` | TINYINT | NO | - | - | Start hour |
| `min_from` | VARCHAR(2) | NO | - | - | Start minute |
| `meridian_from` | VARCHAR(2) | NO | - | - | AM/PM |
| `hour_to` | TINYINT | NO | - | - | End hour |
| `min_to` | VARCHAR(2) | NO | - | - | End minute |
| `meridian_to` | VARCHAR(2) | NO | - | - | AM/PM |
| `time_from` | VARCHAR(100) | NO | - | - | Formatted start time |
| `time_to` | VARCHAR(100) | NO | - | - | Formatted end time |
| `timestamp_from` | VARCHAR(50) | NO | - | - | Epoch string |
| `timestamp_to` | VARCHAR(50) | NO | - | - | Epoch string |
| `full` | VARCHAR(100) | NO | - | - | Formatted range (e.g. '08:00 AM - 09:00 AM') |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`timestamp_from`, `timestamp_to`, `ttr_id`) | Unique slot in timetable |

### 27. `time_tables`
| Column | Type | Nullable | Default | PK/FK/Index | Description |
|---|---|---|---|---|---|
| `id` | INT UNSIGNED AUTO_INCREMENT | NO | - | PK | Primary identifier |
| `ttr_id` | INT UNSIGNED | NO | - | FK -> `time_table_records.id` ON DELETE CASCADE | Timetable ID |
| `ts_id` | INT UNSIGNED | NO | - | FK -> `time_slots.id` ON DELETE CASCADE | Slot ID |
| `subject_id` | INT UNSIGNED | YES | NULL | FK -> `subjects.id` ON DELETE CASCADE | Scheduled Subject |
| `exam_date` | VARCHAR(50) | YES | NULL | - | Examination date string |
| `timestamp_from` | VARCHAR(100) | NO | - | - | Full slot start timestamp |
| `timestamp_to` | VARCHAR(100) | NO | - | - | Full slot end timestamp |
| `day` | VARCHAR(50) | YES | NULL | - | Day of week ('Monday'..'Friday') |
| `day_num` | TINYINT | YES | NULL | - | Day index |
| `created_at` | TIMESTAMP | YES | NULL | - | Timestamp |
| `updated_at` | TIMESTAMP | YES | NULL | UNIQUE(`ttr_id`, `ts_id`, `day`), UNIQUE(`ttr_id`, `ts_id`, `exam_date`) | No slot collision |

### 28. `books` & `book_requests`
- `books`: `id`, `name`, `my_class_id` (FK), `description`, `author`, `book_type`, `url`, `location`, `total_copies`, `issued_copies`, timestamps.
- `book_requests`: `id`, `book_id` (FK), `user_id` (FK), `start_date`, `end_date`, `status`, timestamps.
