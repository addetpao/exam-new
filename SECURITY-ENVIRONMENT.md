# Environment Variables & Secret Management

## 🚨 CRITICAL SECURITY INCIDENT RESOLVED

**Date**: 2025-09-05  
**Incident**: Production secrets were exposed in `.env.example`  
**Status**: **RESOLVED** - Secrets removed and replaced with placeholders  
**Action Required**: **IMMEDIATE KEY ROTATION REQUIRED**

## Exposed Secrets (ROTATE IMMEDIATELY)

The following production secrets were exposed and must be rotated:

1. **Supabase Project**: `kveahsantuaadsdtgibm`
   - Anonymous Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**IMMEDIATE ACTIONS REQUIRED:**

1. Generate new Supabase API keys
2. Update production environment variables in Vercel
3. Invalidate old keys in Supabase dashboard
4. Audit access logs for unauthorized usage

## Environment Configuration

### Development Setup

1. Copy `.env.example` to `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Replace placeholder values with actual development keys:
   - Use **test/development** keys only
   - Never use production credentials in development

### Environment Variable Categories

#### Public Variables (Safe to expose)

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### Private Variables (Server-side only)

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Security Requirements

#### Development Environment

- Use test/development keys only
- Keep `.env.local` out of version control
- Never share environment files via email/chat

#### Production Environment

- Store secrets in Vercel environment variables
- Use production keys only
- Enable secret scanning in CI/CD
- Rotate keys quarterly or on exposure

### Secret Rotation Procedure

1. **Generate New Keys**:
   - Supabase: Project Settings → API → Reset keys
   - Stripe: Dashboard → Developers → API keys → Create new

2. **Update Production**:
   - Vercel Dashboard → Project → Settings → Environment Variables
   - Update all affected variables

3. **Invalidate Old Keys**:
   - Supabase: Delete old keys
   - Stripe: Deactivate old keys

4. **Verify Functionality**:
   - Test all API endpoints
   - Verify webhook functionality
   - Monitor error logs

### Compliance & Monitoring

- **PCI DSS**: Stripe keys must follow PCI compliance
- **SOC2**: Document all key rotations
- **GDPR**: Protect user data access credentials
- **Monitoring**: Alert on authentication failures

### Emergency Response

If secrets are exposed:

1. **IMMEDIATE**: Remove from public repositories
2. **URGENT**: Rotate all affected credentials
3. **CRITICAL**: Update production environments
4. **AUDIT**: Review access logs for misuse
5. **DOCUMENT**: Record incident and lessons learned

## Tools & Automation

- **Secret Scanning**: GitHub Advanced Security
- **Environment Management**: Vercel/Supabase dashboards
- **Key Rotation**: Automated quarterly reminders
- **Access Monitoring**: Supabase/Stripe audit logs
