# ExamPrep Database Schema Overview

## Core Tables Architecture

### Authentication & Users
- **auth.users** (Supabase managed) - Core authentication
- **public.users** - Extended user profiles and RBAC
- **public.user_sessions** - Session tracking and analytics

### Content Management  
- **public.domains** - CompTIA A+ exam domains (1.0, 2.0, etc.)
- **public.objectives** - Specific learning objectives within domains
- **public.questions** - Versioned question content
- **public.question_choices** - Multiple choice options
- **public.pbq_assets** - Performance-based question assets

### Learning & Assessment
- **public.attempts** - User exam/practice attempts
- **public.attempt_items** - Individual question responses
- **public.progress_rollup** - Aggregated learning progress

### Subscriptions & Commerce
- **public.subscriptions** - User subscription management
- **public.subscription_plans** - Available subscription tiers

### Content & Blog
- **public.posts** - Blog posts and articles
- **public.comments** - User comments on posts

### System & Audit
- **public.change_logs** - System audit trail
- **public.system_settings** - Application configuration

## Implementation Status

| Table | Status | Migration | RLS | Indexes |
|-------|--------|-----------|-----|---------|
| users | 🔄 Designing | Pending | Pending | Planned |
| subscriptions | ⏳ Queued | Pending | Pending | Planned |
| change_logs | ⏳ Queued | Pending | Pending | Planned |

## Schema Principles

1. **Supabase Integration**: Leverage auth.users for authentication
2. **Versioned Content**: Support for content versioning and publishing workflow
3. **Performance First**: Strategic indexing for <300ms query times
4. **Security by Design**: RLS policies for all user-facing tables
5. **Audit Trail**: Comprehensive change tracking
6. **Soft Deletes**: Preserve data integrity with soft delete patterns