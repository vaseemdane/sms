# Audit Logging & Traceability Analysis: LAV_SMS

## 1. Existing System Audit Trail Evaluation
- **Historical Logs in Legacy Code**:
  - `promotions` table serves as an audit ledger for academic transitions (`student_id`, `from_class`, `from_section`, `to_class`, `to_section`, `from_session`, `to_session`, `status`, `created_at`).
  - `receipts` table provides a financial paper trail for cash installments (`pr_id`, `amt_paid`, `balance`, `year`, `created_at`).
  - `pins` table logs PIN redemption actions (`used`, `times_used`, `user_id`, `student_id`, `user_type`, `updated_at`).
- **Deficiencies in Legacy System**:
  - Destructive record deletions (e.g. `StudentRecordController@destroy`, `UserController@destroy`) leave zero historical traces.
  - Manual score alterations by teachers or administrators overwrite existing values without recording who modified the grade or when.
  - No IP address or user-agent logging exists for sensitive authentication and password reset events.

## 2. Proposed Modern Audit Logging Architecture

### 1. `audit_logs` Schema Specification
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL, -- e.g., 'STUDENT.ADMIT', 'MARKS.UPDATE', 'FEE.COLLECT', 'PIN.REDEEM'
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'student_records', 'marks', 'receipts'
    entity_id VARCHAR(100) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

### 2. High-Priority Audited Events
1. **Financial Operations**: Fee collection, invoice generation, cashier record resets, discount allocations.
2. **Academic Scores & Grades**: Any modification to `tca`, `exm`, or term final marks after publication.
3. **Session Transitions**: Cohort promotions, retentions, graduations, and promotion rollbacks.
4. **Access Control & Identity**: Administrative password resets, user creation/deletion, role modifications, and scratch PIN batch creation/redemptions.
