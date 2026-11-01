# UI Component Inventory: LAV_SMS Rebuild

## 1. Design System & Atomic Primitives
Built on top of Tailwind CSS and **shadcn/ui** (Radix UI primitives):

- **Atoms**:
  - `Button`: Primary, secondary, outline, destructive, ghost, and icon variants.
  - `Badge`: Status badges (Active, Inactive, Promoted, Retained, Graduated, Paid, Uncleared).
  - `Input` & `Textarea`: Accessible form controls with validation states.
  - `Select` & `Combobox`: Searchable single and multi-select dropdowns.
  - `Checkbox` & `RadioGroup`: For promotion selectors and settings toggles.
  - `Avatar`: Fallback-aware profile image components.
  - `Card`: Content grouping with standard headers, descriptions, and action slots.

- **Molecules & Interactive Containers**:
  - `DataTable`: TanStack Table container with sortable column headers, client/server search filter, pagination controls, and row action menus.
  - `AlertDialog`: Destructive confirmation dialogs (replaces legacy SweetAlert `confirmDelete` and `confirmReset`).
  - `Modal` / `Dialog`: Form overlays for rapid entity creation (Add Class, Add Subject, Add Grade).
  - `DatePicker`: Localized calendar picker for birth dates and term schedules.
  - `StatCard`: Dashboard metric tiles with icons and percentage indicators.

## 2. Domain-Specific Complex Components

### 1. `StudentAdmissionWizard`
- Multi-step interactive stepper:
  - Step 1: Personal Biodata (Name, Gender, DOB, Blood Group, State, LGA).
  - Step 2: Academic Placement (Class, Section, Admission Number, Year).
  - Step 3: Guardian & Hostel Assignment (Parent user lookup, Dorm selection).
  - Step 4: Photo Capture & File Upload.

### 2. `MarksheetMatrix`
- Editable high-performance table for continuous assessment scores:
  - Live column calculations (`tca = t1 + t2 + t3 + t4`, `total = tca + exm`).
  - Real-time grade letter and point resolution against active grade scales.
  - Inline validation preventing inputs exceeding maximum assessment caps.

### 3. `PromotionCohortSelector`
- Two-tier selection grid:
  - Header: Source Class/Section vs Destination Class/Section selectors.
  - Body: Enrolled student cohort list with bulk selection toggles ('Promote All', 'Retain All') and individual row overrides.

### 4. `TimetableGridEditor`
- Interactive weekly schedule matrix:
  - X-Axis: Days of the week (Monday - Friday).
  - Y-Axis: Configured Time Slots.
  - Cells: Subject selection cards with teacher assignment indicators.

### 5. `CashierFeeLedger`
- Real-time payment processing component:
  - Student invoice listing with current balance and payment history.
  - Inline installment entry with instant balance feedback.
  - One-click receipt generation and print/download triggers.

### 6. `ReportCardViewer`
- Branded academic marksheet presentation view:
  - Institutional crest and header.
  - Dual-layout responsive design: interactive screen view + high-fidelity print stylesheet `@media print`.
