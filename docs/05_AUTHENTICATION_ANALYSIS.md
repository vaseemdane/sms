# Authentication Analysis: LAV_SMS

## 1. Authentication Mechanisms
- **Library / Core**: Built on standard `Illuminate\Foundation\Auth\AuthenticatesUsers` and `laravel/ui`.
- **Identity Scheme**: Dual login capability via `LoginController@username`:
  ```php
  public function username()
  {
      $identity = request()->identity;
      $field = filter_var($identity, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';
      request()->merge([$field => $identity]);
      return $field;
  }
  ```
  Users can authenticate interchangeably with an email or username alongside their password.
- **Password Hashing**: Bcrypt (`Hash::make()` with default rounds=10).
- **Session & Cookies**:
  - Laravel session cookie `lav_sms_session` (Encrypted via `EncryptCookies` middleware).
  - CSRF Token verification on all `POST`, `PUT`, `DELETE` requests (`VerifyCsrfToken`).
  - Remember Me token implemented via `remember_token` column in `users` table.

## 2. Password Reset Flow
- User submits email at `/password/reset`.
- Password broker creates hash token in `password_resets` table.
- SwiftMailer/Mail sends reset link containing token.
- User submits new password with token to `ResetPasswordController@reset`.
- Password updated via `Hash::make()`, session regenerated, user logged in.

## 3. Administrative Forced Resets
- Support Team (Admin/Super Admin) can reset user passwords directly:
  - Students (`StudentRecordController@reset_pass`): Resets password to hardcoded default `'student'`.
  - Staff / Other Users (`UserController@reset_pass`): Resets password to hardcoded default `'user'`.
  - Self-service password modification is available at `/my_account/change_password` with verification of `current_password` via `password_verify()`.

## 4. URL ID Obfuscation: Hashids
- The system prevents direct sequential integer ID enumeration in routes using `Hashids`:
  - `Qs::hash($id)`: Encodes integer ID using dynamic salt `date('dMY') . 'CJ'` and minimum length 14.
  - `Qs::decodeHash($str)`: Decodes obfuscated string back to integer.
  - *Note*: Salt includes `date('dMY')`. In the existing code, hashes generated on one day can become invalid after midnight if stored or bookmarked, creating transient session bugs. The modern rebuild will decouple URL slugging from shifting dates.
