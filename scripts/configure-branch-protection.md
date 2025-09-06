# Branch Protection Configuration Guide

## Current Status

Repository: `addetpao/exam-new`
Date: 2025-09-05

## Required Configuration Steps

### Step 1: Navigate to GitHub Repository Settings

1. Go to https://github.com/addetpao/exam-new
2. Click on "Settings" tab
3. Navigate to "Branches" in the left sidebar

### Step 2: Configure Main Branch Protection

**Branch Name Pattern:** `main`

#### Protection Rules to Enable:

- ✅ **Require a pull request before merging**
  - Require approvals: 1
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if CODEOWNERS file exists)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required Status Checks (based on CI workflow):**
    - `lint` (from CI/CD Pipeline workflow)
    - `typecheck` (from CI/CD Pipeline workflow)
    - `test` (from CI/CD Pipeline workflow)
    - `build` (from CI/CD Pipeline workflow)
    - `security-scan` (from CI/CD Pipeline workflow)

- ✅ **Require conversation resolution before merging**
- ✅ **Include administrators** (Apply rules to repository administrators)

#### Additional Settings:

- ✅ **Restrict pushes that create files larger than 100MB**
- ✅ **Do not allow bypassing the above settings**
- ✅ **Delete head branches when pull requests are merged**

### Step 3: Configure Develop Branch Protection (If Created)

**Branch Name Pattern:** `develop`

#### Protection Rules to Enable:

- ✅ **Require a pull request before merging**
  - Require approvals: 1

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Required Status Checks:**
    - `lint`
    - `typecheck`
    - `test`
    - `build`

### Step 4: Verify Repository Secrets

Ensure these secrets are configured in GitHub Settings > Secrets and variables > Actions:

#### Required Secrets:

- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key for migrations
- `STRIPE_SECRET_KEY` - Stripe secret key for webhooks
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook endpoint secret

### Step 5: Test Branch Protection Rules

1. Create a test feature branch:

   ```bash
   git checkout -b test/branch-protection
   ```

2. Make a small change and push:

   ```bash
   echo "# Test Branch Protection" > test-file.md
   git add test-file.md
   git commit -m "test: verify branch protection rules"
   git push origin test/branch-protection
   ```

3. Create a pull request to main branch
4. Verify that:
   - PR cannot be merged without status checks passing
   - PR requires at least 1 reviewer approval
   - All CI jobs must complete successfully

### Step 6: Monitoring and Verification

#### Verification Checklist:

- [ ] Main branch cannot receive direct pushes
- [ ] All CI status checks are required and passing
- [ ] Pull requests require reviewer approval
- [ ] Stale reviews are dismissed on new commits
- [ ] Conversation resolution is required
- [ ] Large files (>100MB) are blocked
- [ ] Rules apply to administrators

#### Key Metrics to Monitor:

- PR merge success rate
- CI pipeline failure rate
- Time to merge (should include review time)
- Security scan pass rate

## Emergency Override Process

In case of critical production issues:

1. **Temporary Bypass (if absolutely necessary):**
   - Administrator can temporarily disable branch protection
   - Must document reason and create post-incident review
2. **Preferred Emergency Process:**
   - Use production deployment workflow with `skip_tests: true`
   - Create immediate follow-up PR to fix underlying issues
   - Schedule post-deployment security review

## Next Steps After Configuration

1. **Create CODEOWNERS file** (if not exists) to define review requirements
2. **Set up automated security scanning** with dependabot
3. **Configure notification settings** for failed CI runs
4. **Document team workflow** for handling failed status checks

## Validation Commands

After configuration, run these commands to verify setup:

```bash
# Check current branch protection (requires GitHub CLI)
gh api repos/addetpao/exam-new/branches/main/protection

# List required status checks
gh api repos/addetpao/exam-new/branches/main/protection/required_status_checks

# Verify workflow runs
gh run list --limit 10
```

---

**Configuration Completed:** Pending manual execution
**Responsible:** DevOps Infrastructure Agent
**Review Date:** Monthly
