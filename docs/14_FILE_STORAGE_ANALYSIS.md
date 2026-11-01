# File Storage Analysis: LAV_SMS

## 1. File Upload Architecture

The existing system utilizes Laravel's `public` filesystem disk rooted in `storage/app/public/`:

```
storage/app/public/
├── uploads/
│   ├── student/
│   │   └── {student_user_code}/
│   │       └── photo.{ext}
│   ├── {user_type}/
│   │   └── {user_code}/
│   │       └── photo.{ext}
│   └── logo.{ext}
```

## 2. File Ingestion & Naming Conventions
- Ingestion occurs in:
  - `StudentRecordController@store` / `@update`: Student profile photos.
  - `UserController@store` / `@update`: Staff & general user photos.
  - `MyAccountController@update_profile`: Self-service avatar update.
  - `SuperAdmin\SettingController@update`: School institutional crest/logo.
- **Naming Pattern**:
  - The system standardizes uploaded avatar filenames to `'photo.' . $ext`.
  - The school crest is named `'logo.' . $ext`.
- **Public URL Resolution**:
  - Assets are served through the public web server symlink `public/storage -> storage/app/public`.
  - Full URLs stored in database using `asset('storage/' . $path)`.

## 3. Storage Deletion Lifecycle
- When a student or user is deleted (`StudentRecordController@destroy`, `UserController@destroy`):
  - Storage path `uploads/{user_type}/{code}` is purged via `Storage::deleteDirectory($path)`.
- If an existing user uploads a replacement photo, the previous photo is overwritten due to the identical `'photo.' . $ext` naming convention.

## 4. Modern Object Storage Rebuild Strategy
- In the rebuilt architecture, avoid saving local server filesystem state.
- **Modern Target**: S3-compatible Object Storage (AWS S3, Cloudflare R2, MinIO, or Supabase Storage).
- **Security Upgrades**:
  - MIME-type sniffing and file signature validation (magic bytes) to prevent executable upload bypass.
  - Client-side or edge avatar image compression (WebP / AVIF).
  - Secure signed URLs for private educational documents and public CDN URLs for logos/avatars.
