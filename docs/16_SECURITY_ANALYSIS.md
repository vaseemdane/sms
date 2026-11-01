# Security & Vulnerability Analysis: LAV_SMS

## 1. Security Evaluation: Current Implementation vs. Modern Rebuild

### 1. URL ID Obfuscation (Hashids with Date Salt)
- **Current Issue**:
  `Qs::hash($id)` incorporates `date('dMY')` into the salt token. While obscuring integer sequential IDs, URLs become invalid after midnight. Furthermore, symmetric obfuscation does not replace cryptographically strong row-level authorization.
- **Recommended Modern Implementation**:
  Replace autoincrement IDs with random, non-sequential UUIDv4 or KSUID/CUID2. Enforce strict server-side tenant/owner authorization checks on every endpoint.

### 2. Hardcoded Default Password Resets
- **Current Issue**:
  `StudentRecordController@reset_pass` and `UserController@reset_pass` reset passwords to static hardcoded strings (`'student'` and `'user'`). This enables trivial account hijacking across an entire institution once one password is known.
- **Recommended Modern Implementation**:
  Issue cryptographically secure, single-use, time-limited password reset tokens delivered directly to the user's verified email or SMS, or force immediate password change on first login.

### 3. File Upload Verification
- **Current Issue**:
  `Qs::getFileMetaData()` inspects `getClientOriginalExtension()` and `getClientMimeType()`, which rely on user-supplied HTTP request headers without verifying underlying file magic bytes. An attacker could rename a malicious script to `.png` or upload polyglot files.
- **Recommended Modern Implementation**:
  Verify file magic bytes (signatures) on the server, reject executables, strip EXIF metadata, re-encode images via sharp/Pillow to sanitized WebP formats, and store files on an isolated object storage bucket without executable permissions.

### 4. Client-Side Input Trust in Cashier Payments
- **Current Issue**:
  In `PaymentController@pay_now`, amount calculations are executed, but client JavaScript in `custom_js.blade.php` calculates running balances in the DOM. Any race condition or concurrent cashier submissions could produce out-of-order balances.
- **Recommended Modern Implementation**:
  Wrap all financial transactions in strict ACID database transactions with row-level locks (`SELECT ... FOR UPDATE`), computing balances exclusively on the server.

### 5. Head Super Admin Protection
- **Current Feature**:
  The system hardcodes protection for user ID `1` (`Qs::headSA()`). While preventing accidental lockout, hardcoding an integer ID is brittle.
- **Recommended Modern Implementation**:
  Implement explicit RBAC roles and policies with immutable system flags (`is_system_root = true`) rather than referencing literal ID 1.

### 6. CSRF & Session Security
- **Current Feature**:
  Standard Laravel `VerifyCsrfToken` middleware is enabled for web forms.
- **Recommended Modern Implementation**:
  Maintain strict CSRF tokens or utilize modern `SameSite=Lax/Strict` HTTP-only, Secure cookies alongside short-lived JWTs.
