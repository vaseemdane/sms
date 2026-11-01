# Modern Target Architecture: LAV_SMS Rebuild

## 1. System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              CLIENT TIER (BROWSER)                                |
|                                                                                   |
|   Next.js 14+ / React 19 (TypeScript)  +  Tailwind CSS  +  shadcn/ui (Radix Primitives)
|   - Declarative Pages & Modals                                                    |
|   - TanStack Query (Server Cache, Optimistic UI Updates)                         |
|   - TanStack Table (Interactive Virtualized DataTables)                           |
|   - React Hook Form + Zod Form Schema Validation                                  |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / JSON API
                                          v
+-----------------------------------------------------------------------------------+
|                              BACKEND APPLICATION TIER                             |
|                                                                                   |
|   API Layer (Next.js Server Actions / Route Handlers or FastAPI / NestJS)         |
|   ├── Authentication Middleware (HTTP-Only Secure Cookie Session / JWT)           |
|   ├── RBAC Authorization Guards (super_admin, admin, teacher, parent, student...)  |
|   ├── Input Validation & Sanitization Layer (Zod / Pydantic)                      |
|   │                                                                               |
|   Domain Services Layer                                                           |
|   ├── StudentService (Admission, Enrollment, Promotion, Rollback Engine)          |
|   ├── MarkService (CA & Exam entry, Grade Resolver, Position Ranking)            |
|   ├── BillingService (Invoices, Cashier Ledger, Payment Receipts)                 |
|   ├── PinService (Scratch Voucher Generation, 5-Use Counter, Student Lock)       |
|   ├── TimetableService (Matrix Scheduling, Time Slot Duplicator)                  |
|   └── DocumentService (Vector PDF Generator: Marksheets & Cash Receipts)         |
|                                                                                   |
|   Data Access Layer                                                               |
|   └── Prisma / Drizzle ORM (Type-Safe Query Builder & Migrations)                 |
+------------------------------------+------------------+---------------------------+
                                     |                  |
            SQL Queries / Pooling    |                  | S3 API (Presigned URLs)
                                     v                  v
+------------------------------------+---+      +-------+---------------------------+
|          DATABASE STORAGE TIER         |      |        OBJECT STORAGE TIER        |
|                                        |      |                                   |
|   PostgreSQL 16 Relational Database    |      |   Cloudflare R2 / AWS S3 / MinIO  |
|   - Strict Foreign Key Cascades        |      |   - Student & Staff Photos        |
|   - ACID Transactions for Cash Ledger  |      |   - School Branding / Logos       |
|   - Composite Indices on Marks/Promotions|    |   - Static PDF Archives           |
+----------------------------------------+      +-----------------------------------+
```

## 2. Layer Responsibilities & Principles
1. **Clean Separation of Concerns**: Strict decoupling of presentation components from domain business logic.
2. **Type Safety Across Boundaries**: Single source of truth for TypeScript types inferred directly from database models and Zod schemas.
3. **Stateless Scalability**: The application server stores zero local files; session state is managed via secure signed tokens; file assets stream to/from object storage.
4. **Idempotent Operations**: Batch operations (e.g. session promotions, mark updates) are designed to be idempotent and wrapped in atomic database transactions.
