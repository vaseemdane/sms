# Comprehensive Testing Strategy: LAV_SMS Rebuild

## 1. Testing Pyramid & Methodology

```
                   /\
                  /  \     End-to-End Tests (Playwright)
                 /----\    - Complete workflows (Admission -> Exam -> Marksheet -> Pin)
                /      \
               /--------\   Integration & API Tests (Vitest / Supertest)
              /          \  - RBAC permission guards, DB transactions, Calculations
             /------------\
            /              \ Unit Tests (Vitest)
           /----------------\ - Helper functions, Grade resolution, Positions, Pin format
```

## 2. Test Suites & Focus Areas

### 1. Unit Tests
- **Grade Scale Resolution**:
  - Verify that score 75 returns grade 'A' / Distinction for junior class type.
  - Verify fallback to universal grade when class-specific grade is undefined.
  - Test boundary conditions (score 0, 100, out of bounds).
- **Position & Ordinal Formatting**:
  - Test position computation algorithm across tied and distinct scores.
  - Test ordinal string output: `1 -> 1st`, `2 -> 2nd`, `3 -> 3rd`, `11 -> 11th`, `21 -> 21st`.
- **Scratch Card PIN Generation**:
  - Verify regex pattern `^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{6}$`.
  - Verify uniqueness across 1,000 generated tokens.

### 2. Integration & API Tests
- **RBAC Matrix Verification**:
  - Test that `teacher` cannot update marks for unassigned subjects.
  - Test that `student` cannot view other students' records or marks.
  - Test that `admin` cannot delete or reset passwords of `super_admin`.
  - Test that `parent` can only access records matching `my_parent_id`.
- **Financial Ledger & ACID Transactions**:
  - Test partial payments decrementing balance accurately.
  - Test concurrent payments on same invoice record preventing race conditions.
  - Test payment reset deleting cash receipts and resetting status flags.
- **Academic Promotion & Rollback Engine**:
  - Test cohort promotion across classes and sessions.
  - Test that promotion rollback removes new session marks and reinstates previous enrollment.

### 3. End-to-End (E2E) Parity Tests
- **Scenario 1: Student Admission to Report Card Flow**:
  1. Super Admin logs in.
  2. Creates new student record with photo upload.
  3. Teacher logs in and enters continuous assessment + exam scores.
  4. Super Admin enables `lock_exam = 1` in System Settings.
  5. Student logs in -> views dashboard -> navigates to report card.
  6. Intercepted by PIN redemption screen.
  7. Enters valid scratch PIN voucher -> marksheet successfully unlocks and renders.
  8. Verifies PDF export downloads report card with identical calculations.
- **Scenario 2: Fee Collection & Receipting Flow**:
  1. Accountant creates fee for class.
  2. Opens Cashier management ledger.
  3. Posts partial cash payment.
  4. Verifies balance dynamically decreases.
  5. Downloads official PDF receipt and verifies ref code and school stamp.
