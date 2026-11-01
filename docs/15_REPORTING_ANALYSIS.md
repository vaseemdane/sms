# Reporting & Document Generation Analysis: LAV_SMS

## 1. Document Inventory

The legacy application generates four critical document types:

### 1. Student Terminal Marksheet / Report Card
- **Endpoint**: `/marks/show/{student_id}/{year}`, `/marks/print/{student_id}/{exam_id}/{year}`
- **Source Tables**: `marks`, `exam_records`, `grades`, `skills`, `student_records`, `users`, `settings`.
- **Data Points Rendered**:
  - School Header: System Name, Address, Contact, Logo.
  - Student Biodata: Name, Admission Number, Class, Section, Academic Session, Term.
  - Continuous Assessment Breakdown: Test scores (`t1`..`t4`), Total CA (`tca`), Exam score (`exm`), Term total (`tex`), Grade letter, Points, Subject Position, Remarks.
  - Term Summary: Total Marks, Term Average, Cohort Class Average, Position in Class/Section (e.g., 2nd out of 34).
  - Behavioral Traits: Affective & Psychomotor rating scale (1 to 5).
  - Narrative Remarks: Form Teacher remark, Principal endorsement, Next Term Begins date, Next Term Tuition fees schedule.

### 2. Master Broadsheet / Tabulation Sheet
- **Endpoint**: `/marks/tabulation/print/{exam}/{class}/{section}`
- **Source Tables**: `marks`, `exam_records`, `subjects`, `my_classes`, `sections`, `users`.
- **Data Points Rendered**:
  - Horizontal grid matrix of every enrolled student in the class arm.
  - Columns for every curriculum subject offered by that class.
  - Total cumulative points, percentage average, rank in class.
  - Pass / Fail summary statistics per subject.

### 3. Cashier Payment Receipts
- **Endpoint**: `/payments/receipts/{id}`, `/payments/pdf_receipts/{id}`
- **Source Tables**: `receipts`, `payment_records`, `payments`, `student_records`, `users`, `settings`.
- **Data Points Rendered**:
  - Receipt Reference Number (`ref_no`).
  - Student details and parent contact.
  - Fee description (e.g., "Term 1 Tuition Fee - JSS 1").
  - Amount Paid in this installment, Cumulative Amount Paid to date, Outstanding Balance.
  - Cashier authorization signature line and institutional seal.

### 4. Class Rosters & Alumni Registers
- **Endpoint**: `/students/list/{class_id}`, `/students/graduated`
- **Source Tables**: `student_records`, `users`, `sections`, `my_classes`.
- **Data Points Rendered**:
  - Full roll of students, admission numbers, section allocations, parent contacts, graduation sessions.

## 2. Modern Export Architecture
- **In-Browser Vector Rendering**: Render responsive HTML print templates using standard CSS `@media print` rules for instant local browser printing.
- **Serverless / Background PDF Rendering**: Headless Chromium (Playwright) or `@react-pdf/renderer` to download identical high-resolution PDFs.
- **Excel / CSV Data Exports**: TanStack Table CSV/XLSX export plugin for tabular broadsheets and student rosters.
