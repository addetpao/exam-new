# ExamPrep Platform API Endpoints

This document provides an overview of the implemented API endpoints for the ExamPrep platform.

## Base URL

- Development: `http://localhost:3003`
- Production: `https://your-domain.com`

## Authentication

Most endpoints require authentication via Supabase session cookies. The session is managed by Next.js middleware.

## Common Response Format

All API responses follow this standardized format:

```json
{
  "data": {
    /* Response data */
  },
  "error": {
    /* Error details if applicable */
  },
  "timestamp": "2025-09-05T04:56:32.791Z"
}
```

## Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      /* Additional error context */
    }
  },
  "timestamp": "2025-09-05T04:56:32.791Z"
}
```

## API Endpoints

### Health Check

#### GET /api/health

Check system health and service status.

**Response:**

```json
{
  "data": {
    "status": "healthy" | "unhealthy",
    "timestamp": "2025-09-05T04:56:32.789Z",
    "version": "0.1.0",
    "services": {
      "database": "healthy" | "unhealthy",
      "auth": "healthy" | "unhealthy",
      "storage": "healthy" | "unhealthy"
    },
    "uptime": 3600
  }
}
```

### Authentication

#### GET /api/auth/session

Get current user session and profile information.

**Requires:** Valid session cookie

**Response:**

```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "role": "user" | "admin",
      "subscription_status": "free" | "trial" | "premium" | "cancelled",
      "subscription_tier": "basic" | "premium",
      "trial_ends_at": "2025-10-01T00:00:00.000Z",
      "created_at": "2025-09-01T00:00:00.000Z"
    }
  }
}
```

#### POST /api/auth/session

Refresh user session and return updated profile.

**Requires:** Valid session cookie

### Practice Mode

#### POST /api/practice

Create a new practice session with adaptive question selection.

**Body:**

```json
{
  "domain_id": "uuid", // Optional - specific domain
  "objective_ids": ["uuid"], // Optional - specific objectives
  "question_count": 10, // 1-50, limited to 50 for free users
  "difficulty": "easy" | "medium" | "hard" // Optional
}
```

**Response:**

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "question_count": 10,
      "started_at": "2025-09-05T04:56:32.789Z",
      "domain_id": "uuid",
      "status": "active"
    },
    "questions": [
      {
        "id": "uuid",
        "question_text": "What is...",
        "question_type": "multiple_choice" | "pbq",
        "domain_id": "uuid",
        "objective_id": "uuid",
        "difficulty": "medium",
        "choices": [
          {
            "id": "uuid",
            "choice_text": "Option A"
          }
        ]
      }
    ]
  }
}
```

#### GET /api/practice

List user's practice sessions with pagination.

**Query Parameters:**

- `limit`: Number of results (1-100, default 20)
- `offset`: Pagination offset (default 0)
- `status`: Filter by status ("active" | "completed")

#### GET /api/practice/[sessionId]

Get practice session details and results.

#### PUT /api/practice/[sessionId]

Submit answers or complete practice session.

**Body for answer submission:**

```json
{
  "action": "submit_answer",
  "question_id": "uuid",
  "selected_choice_id": "uuid",
  "time_spent": 45
}
```

**Body for session completion:**

```json
{
  "action": "complete_session"
}
```

#### DELETE /api/practice/[sessionId]

Cancel/delete an active practice session.

### Exam Mode

#### POST /api/exam

Create a new exam session with domain-weighted question distribution.

**Requires:** Premium subscription or trial

**Body:**

```json
{
  "exam_type": "1101" | "1102" | "combined"
}
```

**Response:**

```json
{
  "data": {
    "session": {
      "id": "uuid",
      "exam_type": "1101",
      "exam_name": "CompTIA A+ Core 1 (220-1101)",
      "total_questions": 90,
      "time_limit": 5400, // seconds
      "passing_score": 675,
      "started_at": "2025-09-05T04:56:32.789Z",
      "status": "active"
    },
    "current_question": {
      "id": "uuid",
      "question_number": 1,
      "question_text": "What is...",
      "question_type": "multiple_choice",
      "domain_id": "uuid",
      "objective_id": "uuid",
      "choices": [
        /* ... */
      ]
    }
  }
}
```

#### GET /api/exam

List user's exam sessions with filtering options.

**Query Parameters:**

- `limit`: Number of results (1-100, default 20)
- `offset`: Pagination offset (default 0)
- `status`: Filter by status
- `exam_type`: Filter by exam type

### Webhooks

#### POST /api/webhooks/stripe

Handle Stripe webhook events for subscription management.

**Headers Required:**

- `stripe-signature`: Stripe webhook signature

**Handles Events:**

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `checkout.session.completed`

## Business Logic

### Domain Weighting (Exam Mode)

The exam questions are distributed according to CompTIA A+ blueprint:

**220-1101 (Core 1):**

- Mobile Devices: 15% (13-18 questions)
- Networking: 20% (18-22 questions)
- Hardware: 25% (23-27 questions)
- Virtualization & Cloud: 11% (10-12 questions)
- Hardware & Network Troubleshooting: 29% (26-30 questions)

**220-1102 (Core 2):**

- Operating Systems: 31% (28-34 questions)
- Security: 25% (23-27 questions)
- Software Troubleshooting: 22% (20-24 questions)
- Operational Procedures: 22% (20-24 questions)

### Subscription Limits

- **Free:** Practice mode only, max 50 questions per session
- **Trial:** Full access for trial period
- **Premium Basic:** 5 exam attempts per 30 days
- **Premium Plus:** 30 exam attempts per 30 days

### Scoring

- Exam scoring uses scaled range (100-900)
- Practice mode shows percentage accuracy
- Analytics events track performance for GA4

## Security Features

- Input validation with Zod schemas
- Supabase RLS (Row Level Security) policies
- Stripe webhook signature verification
- Authentication via session middleware
- Rate limiting on exam attempts
- CORS and security headers

## Performance Standards

- Exam load: < 2 seconds
- Question fetch: < 300ms
- Autosave latency: < 2 seconds

## Testing

Test the API endpoints using curl:

```bash
# Health check
curl -X GET http://localhost:3003/api/health

# Get user session (requires auth cookie)
curl -X GET http://localhost:3003/api/auth/session \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json"
```
