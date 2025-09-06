# Environment Variables Structure

## Overview

This document defines the environment variable structure for the ExamPrep Platform across all deployment environments (development, staging, production).

## Environment-Specific Configuration

### Development (.env.local)

```bash
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_ENV=development

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_test_...

# Analytics Configuration
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_STRIPE=true
NEXT_PUBLIC_ENABLE_PBQ=false
NEXT_PUBLIC_ENABLE_BLOG=false

# Debug Configuration
NEXT_PUBLIC_DEBUG_MODE=true
```

### Staging Environment (Vercel)

```bash
# Application Configuration
NEXT_PUBLIC_APP_URL=https://examprep-staging.vercel.app
NEXT_PUBLIC_APP_ENV=staging

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_staging_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_staging_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_staging_service_role_key

# Stripe Configuration (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_staging_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_test_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_test_...

# Analytics Configuration
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-STAGING-XXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_STRIPE=true
NEXT_PUBLIC_ENABLE_PBQ=true
NEXT_PUBLIC_ENABLE_BLOG=true

# Debug Configuration
NEXT_PUBLIC_DEBUG_MODE=false
```

### Production Environment (Vercel)

```bash
# Application Configuration
NEXT_PUBLIC_APP_URL=https://examprep-platform.vercel.app
NEXT_PUBLIC_APP_ENV=production

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Stripe Configuration (Live Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_prod_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY=price_live_...
NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL=price_live_...

# Analytics Configuration
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-PRODUCTION-XXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_STRIPE=true
NEXT_PUBLIC_ENABLE_PBQ=true
NEXT_PUBLIC_ENABLE_BLOG=true

# Debug Configuration
NEXT_PUBLIC_DEBUG_MODE=false

# Security Configuration
NEXTAUTH_SECRET=your_nextauth_secret_production
NEXTAUTH_URL=https://examprep-platform.vercel.app
```

## Variable Categories

### 1. Public Variables (`NEXT_PUBLIC_*`)

- ✅ Exposed to client-side code
- ✅ Safe for browser exposure
- ⚠️ Never include secrets or sensitive data

### 2. Server-Side Variables

- 🔒 Only available in server-side code
- 🔒 Protected from client exposure
- 🔒 Used for API keys and sensitive operations

### 3. Required Variables by Feature

#### Core Application

- `NEXT_PUBLIC_APP_URL` - Application base URL
- `NEXT_PUBLIC_APP_ENV` - Environment identifier

#### Authentication & Database

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

#### Payment Processing

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY` - Monthly subscription price ID
- `NEXT_PUBLIC_STRIPE_PRICE_ID_ANNUAL` - Annual subscription price ID

#### Analytics

- `NEXT_PUBLIC_GA_MEASUREMENT_ID` - Google Analytics measurement ID

#### Feature Flags

- `NEXT_PUBLIC_ENABLE_ANALYTICS` - Enable/disable analytics
- `NEXT_PUBLIC_ENABLE_STRIPE` - Enable/disable payments
- `NEXT_PUBLIC_ENABLE_PBQ` - Enable/disable PBQ features
- `NEXT_PUBLIC_ENABLE_BLOG` - Enable/disable blog features

## Security Guidelines

### 1. Secret Rotation Schedule

- **Stripe Keys**: Quarterly rotation
- **Supabase Keys**: Monthly rotation for service role
- **Webhook Secrets**: On-demand after any security incident

### 2. Environment Isolation

- Development uses test/development keys only
- Staging uses separate test environment
- Production uses live keys with strict access controls

### 3. Access Controls

- Repository secrets managed by DevOps team only
- Environment-specific secrets use least privilege access
- Regular audit of secret usage and permissions

## Validation Scripts

### Environment Variable Checker

```bash
#!/bin/bash
# Check required environment variables
required_vars=(
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done
echo "All required environment variables are set"
```

## CI/CD Integration

### GitHub Actions Secrets

All production environment variables must be stored as GitHub repository secrets:

- `VERCEL_TOKEN` - Vercel CLI authentication
- `VERCEL_ORG_ID` - Vercel organization identifier
- `VERCEL_PROJECT_ID` - Vercel project identifier
- Plus all environment-specific variables listed above

### Deployment Validation

Each deployment pipeline validates:

1. Required variables are present
2. Variable format is correct (URLs, keys, etc.)
3. Test connectivity to external services
4. Feature flags are appropriately set

## Troubleshooting

### Common Issues

1. **Build failures**: Check if all required variables are set
2. **Stripe errors**: Verify test/live mode consistency
3. **Database connection**: Validate Supabase URL and keys
4. **Analytics not tracking**: Check GA measurement ID format

### Debug Commands

```bash
# Check environment variables in deployment
vercel env ls --token=$VERCEL_TOKEN

# Validate Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"

# Test Stripe webhook endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

**Last Updated:** 2025-09-05
**Responsible Team:** DevOps Infrastructure
**Review Cycle:** After each environment change
