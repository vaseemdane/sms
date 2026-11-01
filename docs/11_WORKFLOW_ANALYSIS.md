# End-to-End Workflow Analysis: LAV_SMS

## 1. Student Admission & Enrollment Workflow
```
[Admin/SuperAdmin] 
   |
   +---> Opens /students/create
   |        |
   |        +-- Inputs Student Biodata (Name, DOB, Gender, Address, State, LGA)
   |        +-- Selects Class, Section, Guardian/Parent, Dormitory
   |        +-- Uploads Passport Photo
   |
   v
[POST /students]
   |
   +---> Validates input via StudentRecordCreate FormRequest
   +---> Generates random user code: Str::random(10)
   +---> Determines Class Type Code (e.g. 'J' or 'S')
   +---> Generates admission number: {APP_CODE}/{CT}/{YEAR}/{ADM_NO}
   +---> Hashes initial default password: Hash::make('student')
   +---> Stores photo in storage/app/public/uploads/student/{code}/photo.{ext}
   +---> Creates User record in `users`
   +---> Creates StudentRecord in `student_records` (sets session to current_session)
   |
   v
[Response: jsonStoreOk()] -> Client receives success toast & redirects
```

## 2. Assessment Mark Entry & Tabulation Workflow
```
[Teacher or Admin]
   |
   +---> Navigates to /marks
   |        |
   |        +-- Selects Exam Term, Academic Class, Section, and Subject
   |        +-- Submits form -> MarkController@selector
   |
   v
[GET /marks/manage/{exam}/{class}/{sec}/{sub}]
   |
   +---> Verifies authorization: If teacher, confirms teacher_id == Auth::user()->id
   +---> Loads existing marks or prepares blank entries for all students in section
   +---> Renders editable grid with t1, t2, t3, t4, and exm inputs
   |
   v
[Teacher inputs/modifies scores]
   |
   +---> Submits PUT /marks/update/...
   |        |
   |        +-- Loops through each student in payload
   |        +-- Computes tca = t1 + t2 + t3 + t4
   |        +-- Computes tex{term} = tca + exm
   |        +-- Resolves matching Grade (letter + points) from `grades`
   |        +-- If Term 3, computes cumulative score: tex1 + tex2 + tex3
   |        +-- Updates `marks` row
   |        +-- Updates aggregate `exam_records` row (total, average, class average)
   |
   v
[Admin opens /marks/tabulation]
   |
   +---> System aggregates all subject marks across section cohort
   +---> Ranks students by descending total score -> computes position (1st, 2nd...)
   +---> Displays or prints broadsheet tabulation matrix
```

## 3. Examination Report Card Access & Scratch PIN Verification Workflow
```
[Student or Parent requests Marksheet: /marks/show/{student_id}/{year}]
   |
   v
[Check Authentication & Ownership]
   |
   +---> If user != student AND user != parent of student AND not teamSAT:
   |        Reject with 403 / "Access Denied"
   |
   v
[Check Exam Lock Setting: Mk::examIsLocked()]
   |
   +---> If lock_exam == 0 OR User is TeamSA (Admin/SuperAdmin):
   |        |
   |        +---> Bypass PIN check -> Render Marksheet directly
   |
   +---> If lock_exam == 1 AND User is Student/Parent:
            |
            +---> Check session: Session::get('pin_verified') == student_id
                     |
                     +-- If YES: Render Marksheet
                     |
                     +-- If NO: Save target URL -> Redirect to /pins/enter/{student_id}
                                    |
                                    v
            [User enters 16-char Scratch PIN code]
                                    |
                                    v
            [POST /pins/verify/{student_id}]
                                    |
                                    +-- Search valid pin in `pins`
                                    +-- Verify times_used < 6
                                    +-- Verify not used for another student
                                    +-- Increment times_used, set used=1, bind user_id & student_id
                                    +-- Put session('pin_verified', student_id)
                                    +-- Redirect to saved marksheet URL
                                    |
                                    v
            [Render Student Marksheet with Assessments, Grades, Skills, Position & PDF Export]
```

## 4. Academic Session Cohort Promotion Workflow
```
[SuperAdmin / Admin opens /students/promotion]
   |
   +---> Selects Source Class & Section, Target Class & Section
   +---> Loads enrolled students for current session
   |
   v
[Form renders student list with Promotion Action radios: 'P', 'D', 'G']
   |
   +---> 'P' (Promote): Moves to target class/section, updates session = next_session
   +---> 'D' (Don't Promote): Remains in source class/section, updates session = next_session
   +---> 'G' (Graduated): Remains in source class, sets grad = 1, grad_date = current_session
   |
   v
[POST /students/promote/...]
   |
   +---> Batch updates `student_records`
   +---> Inserts historical trace in `promotions` table
   |
   v
[Rollback Procedure: /students/promotion/reset_all]
   |
   +---> Queries all promotions for current transition
   +---> Reverts student records to original class, section, session
   +---> Calls delete_old_marks(): Deletes any new session mark entries created accidentally
   +---> Deletes promotion records
```

## 5. Cashier Fee Payment & Receipt Generation Workflow
```
[Accountant opens /payments/manage/{class_id}]
   |
   +---> Selects target class -> displays students with uncleared fee records
   |
   v
[Cashier enters cash amount into student's inline payment field]
   |
   +---> Submits form via AJAX (`form.ajax-pay`)
   |
   v
[POST /payments/pay_now/{payment_record_id}]
   |
   +---> Validates amt_paid > 0 and amt_paid <= balance
   +---> Decrements balance: balance = balance - amt_paid
   +---> Increments paid amount: amt_paid = amt_paid + input_amt
   +---> If balance == 0: sets paid = 1
   +---> Generates unique receipt reference: Pay::genRefCode()
   +---> Inserts record into `receipts`
   +---> Client DOM intercepts response -> decrements balance cell, fades out row if settled
   |
   v
[Accountant / Student / Parent clicks /payments/pdf_receipts/{pr_id}]
   |
   +---> System fetches payment record, receipt history, school settings & logo
   +---> Barryvdh DomPDF compiles HTML receipt template into binary PDF
   +---> Downloads 'Receipt_{ref_no}.pdf' directly to client device
```
