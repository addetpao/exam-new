# Branch Protection Rules Template

## Required Branch Protection Settings

### Main Branch (`main`)

**Protection Rules:**

- ✅ Require a pull request before merging
- ✅ Require approvals: 1 reviewer minimum
- ✅ Dismiss stale PR approvals when new commits are pushed
- ✅ Require review from code owners
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ✅ Require conversation resolution before merging
- ✅ Include administrators in restrictions

**Required Status Checks:**

- `lint` - ESLint and Prettier validation
- `typecheck` - TypeScript compilation
- `test` - Jest test suite
- `build` - Next.js build validation
- `security-scan` - npm audit security check

**Additional Settings:**

- ✅ Restrict pushes that create files larger than 100MB
- ✅ Block force pushes
- ✅ Delete head branches when pull requests are merged

### Develop Branch (`develop`)

**Protection Rules:**

- ✅ Require a pull request before merging
- ✅ Require approvals: 1 reviewer minimum
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging

**Required Status Checks:**

- `lint` - ESLint and Prettier validation
- `typecheck` - TypeScript compilation
- `test` - Jest test suite
- `build` - Next.js build validation

## Implementation Instructions

1. Navigate to GitHub repository settings
2. Go to "Branches" section
3. Add rules for each branch following the specifications above
4. Ensure all team members have appropriate permissions
5. Test the rules with a sample pull request

## Emergency Override Process

In case of emergency deployments:

1. Use the production workflow's `skip_tests` input parameter
2. Document the override reason in the deployment issue
3. Schedule immediate post-deployment review
4. Create follow-up tasks to address any skipped validations

## Secrets Required

Ensure these repository secrets are configured:

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key for migrations
- `STRIPE_SECRET_KEY` - Stripe secret key for webhooks
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret

## Monitoring Integration

Branch protection rules should integrate with:

- GitHub Actions for automated checks
- Vercel for deployment previews
- Supabase for database migration validation
- Stripe for payment system integrity checks

---

**Last Updated:** 2025-09-05
**Responsible Team:** DevOps Infrastructure
**Review Cycle:** Monthly
