# Deployment Architecture: LAV_SMS Rebuild

## 1. Production Topology

```
                                [Internet Traffic]
                                        |
                                        v
                       [Cloudflare CDN / DDoS Protection]
                                        |
                         HTTPS / TLS 1.3 Termination
                                        v
                     [Reverse Proxy / Ingress: Caddy / Nginx]
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
    [Next.js Web / API Service]                  [Headless PDF Worker Service]
      (Docker Container Cluster)                   (Playwright Chromium Pool)
                 |                                             |
                 +----------------------+----------------------+
                                        |
               +------------------------+------------------------+
               |                                                 |
               v                                                 v
   [Managed PostgreSQL 16]                          [Object Storage: S3 / R2]
   - Connection Pooling (PgBouncer)                 - Avatar & School Assets
   - Automated Daily Backups                        - Vector PDF Exports
   - Read Replicas (Optional)
```

## 2. Containerization (Docker Architecture)

### 1. Web Application Service (`Dockerfile`)
- Multi-stage build (Builder stage compiles TypeScript, Next.js bundle; Runner stage runs lightweight node:alpine or distroless image).
- Runs under unprivileged user `nextjs`.
- Health check endpoint `/api/health` probes database connectivity.

### 2. PDF Rendering Sidecar
- Lightweight Node.js microservice running headless Chromium.
- Accepts internal authenticated HTML payload or URL and returns compiled PDF stream.

## 3. Database Migration & Rollback Strategy
- Automated migration step integrated into CI/CD pipeline:
  ```bash
  npx prisma migrate deploy
  ```
- All schema changes backwards-compatible (expand-and-contract pattern).
- Point-in-time recovery (PITR) enabled on managed PostgreSQL instance.

## 4. Monitoring, Health Checks & Observability
- **Health Check Endpoint**: `/api/health` returning JSON `{ status: "ok", db: "connected", timestamp: "..." }`.
- **Structured Logging**: Pino / Winston logger outputting JSON log entries containing request duration, actor ID, HTTP method, status code, and correlation ID.
- **Error Tracking**: Sentry SDK integration for frontend and backend runtime exception capture.
