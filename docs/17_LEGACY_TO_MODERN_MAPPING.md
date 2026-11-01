# Legacy to Modern Mapping: LAV_SMS

## 1. Architectural & Technology Mapping

| Layer / Concern | Legacy PHP Implementation | Proposed Modern Equivalent | Architectural Justification |
|---|---|---|---|
| **Frontend Framework** | Blade templates + jQuery | **Next.js (App Router) / React 19 + TypeScript** | Component-driven reactivity, strict compile-time type safety, zero DOM spaghetti. |
| **Styling & UI Kit** | Bootstrap 4 + Limitless Theme | **Tailwind CSS + shadcn/ui (Radix UI)** | Modern, accessible, lightweight, tokenized themeable design system. |
| **Backend API** | Laravel 8 Monolith Controllers | **Next.js Route Handlers / FastAPI / NestJS (TypeScript)** | Modular RESTful/RPC architecture with structured JSON contracts. |
| **Database Engine** | MySQL 5.7 / 8.0 (InnoDB) | **PostgreSQL 16** | Robust relational integrity, advanced indexing, native JSONB support, strict ACID transactions. |
| **Data Access / ORM** | Eloquent ORM + Repository Pattern | **Prisma ORM / Drizzle ORM (or SQLAlchemy/SQLModel)** | Type-safe queries, automated migrations, explicit relations without N+1 query traps. |
| **Form Validation** | Laravel FormRequest classes | **Zod / Pydantic** | Schema-first validation shared between frontend and backend contracts. |
| **Client State Management** | DOM manipulation + DataTables | **TanStack Query (React Query) + TanStack Table** | Declarative cache management, background revalidation, optimistic updates. |
| **Authentication** | Laravel Session Guard + Bcrypt | **NextAuth.js / Lucia Auth / JWT (Argon2id)** | Modern session management with HTTP-only cookies, multi-session revocation. |
| **Document / PDF Engine** | Barryvdh DomPDF | **Playwright / Headless Chromium or @react-pdf/renderer** | Native CSS Flexbox/Grid support, pixel-perfect print marksheet fidelity. |
| **File Storage** | Local filesystem (`storage/app/public`) | **S3-Compatible Object Storage (AWS S3, Cloudflare R2, MinIO)** | Stateless cloud-native deployment, secure presigned upload URLs. |
| **Background Scheduler** | Synchronous HTTP execution | **BullMQ / Celery / Cloudflare Queues** | Asynchronous execution of batch promotions, broadsheet calculations, and PDF generation. |

## 2. Code Pattern Transformations

### Controller Pattern -> Clean Service Layer
- **Legacy**: Logic split across Controllers, Repositories, and static helper classes (`Qs::*`, `Mk::*`, `Pay::*`).
- **Modern**: Dedicated domain services:
  - `StudentService`: Admission, graduation, promotions, cohort cleanup.
  - `MarkService`: Assessment score recording, grade resolution, cumulative terminal calculations, cohort ranking.
  - `PaymentService`: Invoicing, partial cash settlement, transaction ledger.
  - `PinService`: Cryptographic scratch voucher generation, redemption locks, usage count verification.
