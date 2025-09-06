# GitHub Repository Infrastructure

This directory contains the complete CI/CD pipeline and infrastructure configuration for the ExamPrep Platform.

## 🏗️ Infrastructure Overview

Our infrastructure follows a multi-environment deployment strategy with automated testing, security scanning, and database migration validation.

### Deployment Pipeline Flow

```
Feature Branch → Pull Request → Develop Branch → Staging → Main Branch → Production
                      ↓              ↓              ↓           ↓
                   CI Tests      Staging Deploy   Full Tests  Production Deploy
```

## 📁 Directory Structure

```
.github/
├── workflows/
│   ├── ci.yml                    # Core CI/CD pipeline (lint, test, build)
│   ├── staging-deploy.yml        # Staging environment deployment
│   ├── production-deploy.yml     # Production deployment with rollback
│   ├── security-scan.yml         # Comprehensive security scanning
│   └── database-migrations.yml   # Database migration validation
├── BRANCH_PROTECTION_RULES.md    # Branch protection configuration guide
├── ENVIRONMENT_VARIABLES.md      # Environment variable documentation
├── CODEOWNERS                    # Code review ownership definitions
└── README.md                     # This file
```

## 🛡️ Branch Protection Rules

### Main Branch Protection

The main branch is protected with the following requirements:

- ✅ **Pull Request Required**: Direct pushes to main are blocked
- ✅ **Status Checks Required**: All CI jobs must pass (lint, typecheck, test, build, security-scan)
- ✅ **Review Required**: Minimum 1 approving reviewer
- ✅ **Dismiss Stale Reviews**: New commits invalidate previous approvals
- ✅ **Conversation Resolution**: All PR discussions must be resolved
- ✅ **Admin Enforcement**: Rules apply to repository administrators
- ✅ **Up-to-date Branches**: Feature branches must be current with main

### Configuration Status

🔧 **Setup Required**: Branch protection rules need manual configuration through GitHub web interface.

**Quick Setup**:

1. Go to repository Settings > Branches
2. Add rule for `main` branch
3. Follow the checklist in `BRANCH_PROTECTION_RULES.md`
4. Run `scripts/verify-branch-protection.sh` to validate

## 🔄 Workflow Descriptions

### Core CI/CD Pipeline (`ci.yml`)

**Triggers:** Push to main/develop, Pull requests to main

- ✅ ESLint and Prettier validation
- ✅ TypeScript compilation check
- ✅ Jest test suite execution
- ✅ Next.js build verification
- ✅ Security audit scanning

### Staging Deployment (`staging-deploy.yml`)

**Triggers:** Push to develop branch

- 🚀 Automatic deployment to Vercel staging environment
- 🧪 Basic smoke tests and connectivity validation
- 🔍 Environment variable validation
- 💬 PR comments with staging URLs

### Production Deployment (`production-deploy.yml`)

**Triggers:** Push to main branch, Manual dispatch

- ⚡ Comprehensive pre-deployment validation
- 🎯 Production deployment to Vercel
- 🔍 Post-deployment smoke tests
- 🚨 Automatic rollback on failure
- 📊 Performance validation (2s load time requirement)

### Security Scanning (`security-scan.yml`)

**Triggers:** Push to main/develop, PRs, Daily at 2 AM UTC, Manual dispatch

- 🔒 Dependency vulnerability scanning
- 🕵️ Secret detection and validation
- 🛡️ Code security pattern analysis
- 🌐 Environment security validation
- 📦 Supply chain security checks
- 📋 Automated security issue creation

### Database Migration Validation (`database-migrations.yml`)

**Triggers:** Changes to supabase/migrations/\*, Manual dispatch

- 🗄️ Migration file structure validation
- 🧪 Local Supabase instance testing
- 🔄 Migration rollback capability testing
- 📊 Data integrity validation
- 🚀 Production readiness assessment

## 🔐 Security Features

### Automated Security Controls

- **Secret Detection**: Scans for hardcoded secrets and API keys
- **Dependency Scanning**: Daily vulnerability checks with npm audit
- **Code Analysis**: Pattern detection for security anti-patterns
- **Environment Validation**: Ensures proper configuration isolation
- **Supply Chain**: Validates package integrity and sources

### Security Thresholds

- Critical vulnerabilities: ❌ Block deployment
- High vulnerabilities: ⚠️ Warning with audit trail
- Moderate vulnerabilities: ℹ️ Information tracking

## 📊 Performance Requirements

### Monitored Metrics

- **Exam Loading**: < 2 seconds
- **Question Fetch**: < 300ms
- **Autosave Latency**: < 2 seconds
- **Build Time**: < 5 minutes
- **Deployment Time**: < 3 minutes

### Performance Gates

- Production deployment fails if smoke tests exceed performance thresholds
- Staging environment monitors but doesn't block on performance issues
- Performance reports generated for all environments

## 🎛️ Environment Management

### Environment Hierarchy

1. **Development**: Local development with test data
2. **Staging**: Vercel preview with test Stripe/Supabase
3. **Production**: Live environment with production services

### Secret Management

- Repository secrets stored in GitHub
- Environment-specific variable isolation
- Automated secret rotation reminders
- Audit trail for all secret access

## 🚨 Emergency Procedures

### Production Incident Response

1. **Immediate Rollback**: `git revert` + manual workflow dispatch
2. **Emergency Deployment**: Use `skip_tests` parameter with documentation
3. **Database Recovery**: Automated backup restoration (when implemented)
4. **Communication**: Automated issue creation for team notification

### Rollback Procedures

- **Application Code**: Automatic rollback via Vercel on failed post-deployment tests
- **Database**: Manual rollback procedures (to be implemented with Supabase MCP)
- **Feature Flags**: Immediate disable via environment variables

## 📈 Monitoring and Alerting

### Automated Alerts

- ❌ Build/deployment failures → GitHub Issues
- 🔒 Security scan failures → Critical GitHub Issues
- ⚠️ Performance threshold breaches → Warning notifications
- 🗄️ Database migration failures → Immediate team notification

### Reporting

- Daily security scan summaries
- Weekly deployment metrics
- Monthly infrastructure health reports

## 🔧 Maintenance Tasks

### Regular Maintenance

- **Weekly**: Review security scan reports
- **Monthly**: Update dependency versions
- **Quarterly**: Rotate sensitive API keys
- **Semi-annually**: Full infrastructure audit

### Automated Maintenance

- Daily security scans
- Automated dependency updates (Dependabot)
- Pre-commit hooks enforcement
- Continuous integration monitoring

## 📚 Integration Points

### External Services

- **Vercel**: Hosting and deployment
- **Supabase**: Database and authentication
- **Stripe**: Payment processing
- **Google Analytics**: User tracking
- **GitHub**: Source control and CI/CD

### MCP Server Integration

When MCP servers are fully configured:

- Supabase MCP: Database operations and migrations
- Stripe MCP: Payment webhook management
- Vercel MCP: Advanced deployment controls
- GitHub MCP: Repository management automation

## 🎯 Success Metrics

### Infrastructure Health

- **Uptime**: >99.9% availability target
- **Deploy Success Rate**: >95% successful deployments
- **Security Incidents**: Zero critical security issues in production
- **Performance SLA**: Meet all performance requirements >98% of time

### Development Velocity

- **Build Time**: < 5 minutes average
- **PR Review Time**: < 24 hours average
- **Deployment Frequency**: Multiple daily deployments supported
- **Recovery Time**: < 2 hours for critical issues (RTO)

---

**Maintained by**: DevOps Infrastructure Team  
**Last Updated**: 2025-09-05  
**Review Schedule**: Monthly infrastructure review
