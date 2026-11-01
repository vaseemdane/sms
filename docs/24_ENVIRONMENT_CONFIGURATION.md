# Environment Configuration Specification: LAV_SMS

## 1. Environment Variable Reference

```env
# ==============================================================================
# APPLICATION CORE
# ==============================================================================
NODE_ENV=production
NEXT_PUBLIC_APP_NAME="LAV_SMS Modern School System"
NEXT_PUBLIC_APP_URL="https://sms.school.edu"
APP_SECRET="<secret-32-byte-hex-string>"

# ==============================================================================
# DATABASE (POSTGRESQL)
# ==============================================================================
DATABASE_URL="postgresql://<db_user>:<db_password>@<db_host>:5432/<db_name>?schema=public&sslmode=prefer"
DATABASE_DIRECT_URL="postgresql://<db_user>:<db_password>@<db_host>:5432/<db_name>?schema=public" # Prisma Direct for Migrations
DATABASE_POOL_MAX=20

# ==============================================================================
# AUTHENTICATION & SESSIONS
# ==============================================================================
AUTH_SECRET="<secret-random-token>"
AUTH_URL="https://sms.school.edu/api/auth"
JWT_EXPIRATION="7d"
COOKIE_SECURE=true
COOKIE_SAME_SITE="lax"

# ==============================================================================
# S3-COMPATIBLE OBJECT STORAGE
# ==============================================================================
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
S3_REGION="auto"
S3_BUCKET_NAME="school-management-assets"
S3_ACCESS_KEY_ID="<secret-s3-access-key>"
S3_SECRET_ACCESS_KEY="<secret-s3-secret-key>"
NEXT_PUBLIC_S3_CDN_URL="https://cdn.school.edu"

# ==============================================================================
# TRANSACTIONAL EMAIL (RESEND / SMTP / SENDGRID)
# ==============================================================================
MAIL_FROM_ADDRESS="no-reply@school.edu"
MAIL_FROM_NAME="School Administration"
EMAIL_PROVIDER="resend" # or "smtp"
RESEND_API_KEY="<secret-resend-api-key>"
# SMTP Fallback:
SMTP_HOST="<secret-smtp-host>"
SMTP_PORT=587
SMTP_USER="<secret-smtp-user>"
SMTP_PASSWORD="<secret-smtp-pass>"

# ==============================================================================
# SMS / NOTIFICATION GATEWAY (OPTIONAL)
# ==============================================================================
SMS_PROVIDER="termii" # or "twilio"
TERMII_API_KEY="<secret-termii-key>"
TERMII_SENDER_ID="SCHOOL"

# ==============================================================================
# PDF ENGINE SERVICE (PLAYWRIGHT / PUPPETEER)
# ==============================================================================
PDF_SERVICE_URL="http://pdf-service:3000/render"
PDF_SERVICE_SECRET="<secret-internal-token>"
```
