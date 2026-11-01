# Dependency Map & Modern Replacement Analysis: LAV_SMS

## 1. PHP & Composer Dependencies

| Existing Dependency | Purpose in Legacy Codebase | Proposed Modern Stack Equivalent | Replacement Rationale |
|---|---|---|---|
| `laravel/framework` (v8.40) | Full-stack MVC PHP framework, routing, ORM, controllers | **FastAPI / Node.js NestJS / Express + Next.js** | Decoupled client/server, high throughput async execution, type safety with TypeScript. |
| `barryvdh/laravel-dompdf` | Server-side HTML-to-PDF rendering for report cards & payment receipts | **@react-pdf/renderer** or headless Chromium (**Puppeteer / Playwright**) | Modern CSS support (Flexbox, Grid), faster client/server-side vector PDF generation, no PHP DomPDF rendering quirks. |
| `hashids/hashids` (v4.1) | Obfuscates integer primary keys in URLs (salt includes date) | **UUIDv4 / CUID2** or secure Base62 IDs | Hashids with dynamic date salt caused expired URL bugs; UUIDs/CUIDs are collision-free, stateless, and naturally non-sequential. |
| `laravel/ui` (v3.0) | Authentication scaffolding and Bootstrap UI presets | **NextAuth.js / Supabase Auth / JWT + Argon2id** | Industry-standard stateless JWT or secure HTTP-only session tokens with modern MFA capabilities. |
| `fruitcake/laravel-cors` | Handles HTTP Cross-Origin Resource Sharing | **Built-in framework CORS middleware** (e.g. FastAPI CORS / Express CORS) | Modern backends provide native, zero-dependency CORS handlers. |
| `fideloper/proxy` | Resolves reverse-proxy client IPs and SSL termination | **Native reverse proxy config** (Nginx, Caddy, Cloudflare, Traefik headers) | Standard `X-Forwarded-For` and `X-Forwarded-Proto` handling is standard in modern reverse proxies. |
| `guzzlehttp/guzzle` | General HTTP client | **Native `fetch` / `axios` / `httpx`** | Modern runtimes support standards-based async HTTP clients. |
| `fakerphp/faker` | Seeds synthetic test data for users and students | **@faker-js/faker** (Node) or **Faker** (Python) | Equivalent development seed tooling. |

## 2. Frontend Libraries & CSS Assets

| Existing Asset | Purpose in Legacy Codebase | Modern Replacement | Replacement Rationale |
|---|---|---|---|
| **Bootstrap 4** | Grid system, form controls, styling classes | **Tailwind CSS + shadcn/ui** | Utility-first styling, zero runtime overhead, fully accessible primitives (Radix UI). |
| **Limitless Theme** | Custom commercial admin dashboard skin | **Custom Tailwind Layout + Modern Design System** | Clean, responsive, dark/light theme support without bloated legacy CSS overrides. |
| **jQuery 3.x** | DOM manipulation, AJAX form interceptors, event handlers | **React 18/19 + React Query (@tanstack/react-query)** | Declarative state-driven UI, automatic cache invalidation, no manual DOM mutating scripts. |
| **DataTables.js** | Tabular listings, client sorting, search, pagination | **TanStack Table (React Table)** | Headless, ultra-fast, virtualized table rendering with native TypeScript support. |
| **SweetAlert (swal)** | Modal alerts and delete confirmation dialogs | **shadcn/ui AlertDialog & Dialog** | Accessible, themeable, React component modals with keyboard navigation. |
| **PNotify** | Toast notifications for flash alerts | **Sonner** or **react-hot-toast** | Lightweight, animated, accessible toast system. |
| **Bootstrap Datepicker** | Interactive date selection for DOB and term dates | **shadcn/ui Calendar / DatePicker (react-day-picker)** | Clean, localized, keyboard accessible date pickers. |
| **Select2** | Searchable select dropdowns | **shadcn/ui Combobox / Command (cmdk)** | Accessible, performant searchable dropdowns. |
