# Security Environment Setup Guide

## CRITICAL: Exposed Token Security Incident Response

**DATE**: 2025-09-05  
**SEVERITY**: CRITICAL  
**STATUS**: RESOLVED  

### Incident Summary
- **EXPOSED TOKEN**: Supabase access token `sbp_488a01e3237668140c8f71236b3f1d4f94920596` was hardcoded in:
  - `supabasemcp-config.json`
  - `.claude/settings.local.json`
- **ACTION TAKEN**: Token removed from repository, configurations updated to use environment variables

### IMMEDIATE ACTIONS REQUIRED

1. **ROTATE THE EXPOSED TOKEN IMMEDIATELY**:
   - Go to Supabase Dashboard → Settings → Access Tokens
   - Revoke token: `sbp_488a01e3237668140c8f71236b3f1d4f94920596`
   - Generate new access token
   - Update local environment with new token

2. **SECURE ENVIRONMENT SETUP**:

```bash
# Copy the environment template
cp .env.example .env.local

# Edit .env.local with your actual secrets
# NEVER commit this file to version control
```

### Required Environment Variables

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# MCP Server Token (CRITICAL - Keep Secure)
SUPABASE_ACCESS_TOKEN=sbp_your_new_rotated_token_here

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Security Protocols

#### For Development
1. Always use test/sandbox keys for development
2. Never commit actual secrets to version control
3. Use `.env.local` for sensitive values (already in .gitignore)
4. Rotate tokens immediately if exposed

#### For Production (Vercel)
1. Use Vercel Environment Variables dashboard
2. Enable "Sensitive" flag for all secret values
3. Use production keys only in production environment
4. Enable preview/staging environments with test keys

### MCP Configuration Security

The MCP server configurations now use environment variable substitution:

- `supabasemcp-config.json`: Uses `${SUPABASE_ACCESS_TOKEN}`
- `stripemcp-config.json`: Uses `${STRIPE_SECRET_KEY}`

### Verification Checklist

- [ ] Exposed Supabase token rotated in dashboard
- [ ] New token added to `.env.local`
- [ ] All MCP configurations use environment variables
- [ ] `.gitignore` covers all sensitive files
- [ ] Production environment variables configured in Vercel
- [ ] Test environment setup verified

### Monitoring and Alerts

Set up monitoring for:
- Unauthorized access attempts
- Suspicious API usage patterns
- Failed authentication events
- Unusual billing activity

### Emergency Response

If secrets are exposed again:
1. **IMMEDIATE**: Rotate all affected tokens/keys
2. **WITHIN 1 HOUR**: Update all environments
3. **WITHIN 24 HOURS**: Audit access logs
4. **DOCUMENT**: Incident response and lessons learned

### Contact Security Shield Agent

For security-related issues, coordinate with Security Shield agent using:
```
🎯 Security Shield Agent: [SECURITY ISSUE DESCRIPTION]
```

---

**REMEMBER**: This incident demonstrates the critical importance of proper secrets management. Never hardcode production secrets in configuration files.