#!/bin/bash

# Branch Protection Verification Script
# This script verifies that branch protection rules are properly configured

set -e

REPO_OWNER="addetpao"
REPO_NAME="exam-new"
BRANCH="main"

echo "🛡️  Verifying Branch Protection Rules for ${REPO_OWNER}/${REPO_NAME}"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if GitHub CLI is available
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
        echo "Please install GitHub CLI: https://cli.github.com/"
        echo "Or configure branch protection manually through GitHub web interface"
        exit 1
    fi
    
    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${RED}❌ GitHub CLI is not authenticated${NC}"
        echo "Please run: gh auth login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ GitHub CLI is available and authenticated${NC}"
}

# Function to verify branch protection rules
verify_protection() {
    local branch=$1
    echo ""
    echo "Checking branch protection for: ${branch}"
    echo "----------------------------------------"
    
    # Get branch protection status
    if ! protection_data=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch}/protection 2>/dev/null); then
        echo -e "${RED}❌ No branch protection rules found for ${branch}${NC}"
        return 1
    fi
    
    # Parse protection data
    pr_required=$(echo "$protection_data" | jq -r '.required_pull_request_reviews != null')
    status_checks_required=$(echo "$protection_data" | jq -r '.required_status_checks != null')
    enforce_admins=$(echo "$protection_data" | jq -r '.enforce_admins.enabled // false')
    
    # Check PR requirements
    if [ "$pr_required" = "true" ]; then
        echo -e "${GREEN}✅ Pull request reviews required${NC}"
        
        # Check review count
        review_count=$(echo "$protection_data" | jq -r '.required_pull_request_reviews.required_approving_review_count // 0')
        if [ "$review_count" -ge 1 ]; then
            echo -e "${GREEN}✅ Minimum ${review_count} reviewer(s) required${NC}"
        else
            echo -e "${YELLOW}⚠️  No minimum reviewers configured${NC}"
        fi
        
        # Check dismiss stale reviews
        dismiss_stale=$(echo "$protection_data" | jq -r '.required_pull_request_reviews.dismiss_stale_reviews // false')
        if [ "$dismiss_stale" = "true" ]; then
            echo -e "${GREEN}✅ Stale reviews are dismissed${NC}"
        else
            echo -e "${YELLOW}⚠️  Stale reviews not dismissed${NC}"
        fi
        
    else
        echo -e "${RED}❌ Pull request reviews not required${NC}"
    fi
    
    # Check status checks
    if [ "$status_checks_required" = "true" ]; then
        echo -e "${GREEN}✅ Status checks required${NC}"
        
        # Get required checks
        required_checks=$(echo "$protection_data" | jq -r '.required_status_checks.checks[].context')
        expected_checks=("lint" "typecheck" "test" "build" "security-scan")
        
        echo "Required status checks:"
        for check in $required_checks; do
            echo "  - $check"
        done
        
        # Verify all expected checks are present
        missing_checks=()
        for expected in "${expected_checks[@]}"; do
            if ! echo "$required_checks" | grep -q "^$expected$"; then
                missing_checks+=("$expected")
            fi
        done
        
        if [ ${#missing_checks[@]} -eq 0 ]; then
            echo -e "${GREEN}✅ All expected status checks are configured${NC}"
        else
            echo -e "${YELLOW}⚠️  Missing status checks: ${missing_checks[*]}${NC}"
        fi
        
    else
        echo -e "${RED}❌ Status checks not required${NC}"
    fi
    
    # Check admin enforcement
    if [ "$enforce_admins" = "true" ]; then
        echo -e "${GREEN}✅ Rules apply to administrators${NC}"
    else
        echo -e "${YELLOW}⚠️  Rules do not apply to administrators${NC}"
    fi
}

# Function to verify repository secrets
verify_secrets() {
    echo ""
    echo "Verifying Repository Secrets"
    echo "----------------------------"
    
    expected_secrets=(
        "VERCEL_TOKEN"
        "VERCEL_ORG_ID" 
        "VERCEL_PROJECT_ID"
        "NEXT_PUBLIC_SUPABASE_URL"
        "SUPABASE_SERVICE_ROLE_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
    )
    
    # Get repository secrets (names only, values are not accessible)
    if secrets_list=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets 2>/dev/null); then
        configured_secrets=$(echo "$secrets_list" | jq -r '.secrets[].name')
        
        for secret in "${expected_secrets[@]}"; do
            if echo "$configured_secrets" | grep -q "^$secret$"; then
                echo -e "${GREEN}✅ $secret${NC}"
            else
                echo -e "${RED}❌ $secret (missing)${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  Cannot verify secrets (insufficient permissions)${NC}"
    fi
}

# Function to check workflow status
check_workflows() {
    echo ""
    echo "Checking Recent Workflow Runs"
    echo "------------------------------"
    
    # Get recent workflow runs
    if runs=$(gh run list --limit 5 --json status,conclusion,name,headBranch 2>/dev/null); then
        echo "$runs" | jq -r '.[] | "\(.status)/\(.conclusion // "pending") - \(.name) (\(.headBranch))"' | while read line; do
            if echo "$line" | grep -q "completed/success"; then
                echo -e "${GREEN}✅ $line${NC}"
            elif echo "$line" | grep -q "completed/failure"; then
                echo -e "${RED}❌ $line${NC}"
            else
                echo -e "${YELLOW}⏳ $line${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  Cannot access workflow runs${NC}"
    fi
}

# Main execution
main() {
    # Check prerequisites
    check_gh_cli
    
    # Verify branch protection
    verify_protection "$BRANCH"
    
    # Check if develop branch exists and verify it too
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/develop &>/dev/null; then
        verify_protection "develop"
    else
        echo -e "${YELLOW}⚠️  Develop branch not found (optional)${NC}"
    fi
    
    # Verify secrets
    verify_secrets
    
    # Check workflows
    check_workflows
    
    echo ""
    echo "=================================================="
    echo -e "${GREEN}🎯 Branch protection verification complete${NC}"
    echo "See scripts/configure-branch-protection.md for manual setup if needed"
}

# Run main function
main