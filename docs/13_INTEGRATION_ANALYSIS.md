# External Integrations Analysis: LAV_SMS

## 1. Existing System Integrations

### 1. Barryvdh DomPDF Integration
- **Purpose**: Dynamic vector generation of student report cards (`marks.print`) and cashier cash receipts (`payments.pdf_receipts`).
- **Mechanism**: Reads Blade template views, injects CSS stylesheets and school branding logos, renders server-side binary stream via `PDF::loadView(...)->download(...)`.
- **Strengths & Limitations**: Works without external cloud services; however, DomPDF lacks support for modern CSS flexbox/grid and causes occasional layout overflow on complex tabular broadsheets.
- **Modern Strategy**: Replace with **Playwright/Puppeteer headless rendering** or **@react-pdf/renderer** to generate crisp, standard-compliant vector PDFs.

### 2. Hashids Symmetric Obfuscation
- **Purpose**: Concealing database autoincrement primary keys from URLs.
- **Configuration**: Uses salt derived from `date('dMY') . 'CJ'` and minimum length 14.
- **Vulnerability / Flaw**: Incorporating `date('dMY')` into the salt causes hashes generated today to fail decryption tomorrow.
- **Modern Strategy**: Adopt native public UUIDv4 or KSUID/CUID2 identifiers for all externally surfaced resources.

### 3. SMTP Mail Configuration (SwiftMailer)
- **Purpose**: Dispatching password recovery reset tokens to users.
- **Configuration**: Standard Laravel `.env` variables (`MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`).
- **Modern Strategy**: Configure modern transactional email providers (Resend, SendGrid, Amazon SES, or Postmark) with DKIM/SPF support.

### 4. SMS / WhatsApp Notifications (Planned Extension)
- **Status in Legacy Code**: The system is named `LAV_SMS`, references contact phone numbers for parents/students, but SMS dispatch gateways were not completed in the controller code.
- **Modern Strategy**: Integrate **Twilio** or **Termii** (popular in West Africa / Nigeria where LAV_SMS originates) for automated transactional SMS alerts upon admission, fee payment confirmation, and term report publishing.

### 5. Payment Gateways (Planned Extension)
- **Status in Legacy Code**: Cashier-recorded manual cash receipts only.
- **Modern Strategy**: Integrate **Paystack** / **Flutterwave** / **Stripe** webhook-driven checkout for online parent fee payments alongside manual cashier entry.
