# State Management Strategy: LAV_SMS Rebuild

## 1. State Categorization & Allocation

To avoid anti-patterns of monolithic global state, state is partitioned cleanly across five domains:

```
+-------------------------------------------------------------------------------+
|                               APPLICATION STATE                               |
+-------------------+-------------------+-------------------+-------------------+
|   SERVER STATE    |   SESSION STATE   |    FORM STATE     |   URL / ROUTE     |
| (TanStack Query)  |  (NextAuth / JWT) | (React Hook Form) |   (Next Router)   |
+-------------------+-------------------+-------------------+-------------------+
| - Students list   | - Current user    | - Admission wizard| - Class filter    |
| - Score sheets    | - Role & permissions- Mark entry row  | - Section filter  |
| - Invoices & fees | - Session token   | - Settings forms  | - Search query    |
| - Timetable grid  | - Verified PIN flag| - Payment inputs | - Page index      |
+-------------------+-------------------+-------------------+-------------------+
```

## 2. Management Mechanisms

### 1. Server State (Data Caching & Synchronization)
- **Library**: **TanStack Query (React Query v5)**
- **Role**: Caching server responses, handling background revalidation, stale-while-revalidate data fetching, and optimistic mutations.
- **Cache Invalidation Keys**:
  - `['students', classId, sectionId]`
  - `['marks', examId, classId, sectionId, subjectId]`
  - `['payments', studentId, year]`
  - `['timetables', ttrId]`
- **Optimistic Updates**: Immediate UI reflection during inline cashier payments and score inputs before server response resolves.

### 2. Session & Authentication State
- **Library**: **NextAuth.js / Secure HTTP-Only Cookie Session**
- **Role**: Storing authenticated user metadata, role permissions, and active academic session context.
- **PIN Verification Token**: Stored in a cryptographically signed cookie `pin_verified_student_{id}` with a 2-hour expiration window.

### 3. Form State & Schema Validation
- **Library**: **React Hook Form + Zod**
- **Role**: Managing local form input state, dirty states, touched fields, and schema-driven client-side validation before dispatching to API endpoints.

### 4. URL & Filter State
- **Library**: Native Next.js `useSearchParams` / Nuqs (Type-safe search params)
- **Role**: Storing active class selections, section filters, search keywords, and pagination offsets in the URL query string.
- **Benefit**: Ensures shareable, bookmarkable, and reload-safe administrative dashboards.
