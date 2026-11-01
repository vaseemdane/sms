# Error Handling & Resilience Specification: LAV_SMS

## 1. Unified HTTP Error Model

All modern backend API endpoints conform to RFC 7807 (Problem Details for HTTP APIs) structured JSON responses:

```json
{
  "type": "https://api.lavsms.io/errors/validation-error",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "The provided student score exceeds the maximum continuous assessment cap.",
  "instance": "/api/v1/examinations/marks/entry",
  "invalidParams": [
    {
      "name": "tca",
      "reason": "Total continuous assessment cannot exceed 40 points."
    }
  ]
}
```

## 2. Standard HTTP Status Code Conventions

| Status Code | Description | Application Scenarios |
|---|---|---|
| **400 Bad Request** | Malformed request syntax or invalid parameters | Invalid query params, malformed JSON body. |
| **401 Unauthorized** | Missing or invalid authentication credentials | Expired JWT/session token, unauthenticated request to protected route. |
| **403 Forbidden** | Authenticated user lacks permission for action | Admin attempting to edit Head Super Admin; Teacher editing unassigned subject; Student accessing another student's report card. |
| **404 Not Found** | Target resource does not exist | Student record, class, or invoice ID not found. |
| **409 Conflict** | Request conflicts with current database state | Duplicate admission number, duplicate exam for term/session, concurrent cashier payment collision. |
| **422 Unprocessable** | Request schema or business rule validation failed | Grade threshold overlap, invalid scratch PIN code, payment amount greater than outstanding balance. |
| **500 Server Error** | Unexpected unhandled backend exception | Database connection drop, PDF compilation failure. Error logged with unique trace ID. |

## 3. Frontend Error Handling & User Experience
- **Form Errors**: React Hook Form binds Zod validation errors directly to the corresponding UI input field with red focus borders and error descriptions.
- **Toast Alerts**: Non-blocking toast notifications (Sonner) for mutation failures or network dropouts.
- **Error Boundaries**: React Error Boundary wrappers around major page regions to isolate component crashes and provide a friendly "Try Again" recovery action.
- **PIN Lockout Interceptor**: Next.js middleware interceptor automatically catches `403 Exam Locked` responses and presents the Scratch PIN redemption dialog without navigating away from the target page.
