# Branch Protection Rules Implementation Guide

## Overview
This document provides a comprehensive guide for setting up and managing branch protection rules in the Collaborative Code Review platform. Branch protection rules ensure code quality, enforce review processes, and maintain repository integrity.

## Table of Contents
- [GitHub Repository Configuration](#github-repository-configuration)
- [Local Enforcement System](#local-enforcement-system)
- [Frontend Components](#frontend-components)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Team Workflow](#team-workflow)
- [Troubleshooting](#troubleshooting)

## GitHub Repository Configuration

### 1. Access Branch Protection Settings
1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** for your main branch (e.g., `main`, `master`, `develop`)

### 2. Recommended Protection Rules

#### Required Settings:
- ✅ **Require a pull request before merging**
  - Require approvals: `2` (or as per team policy)
  - Dismiss stale PR approvals when new commits are pushed
  - Require review from code owners (if CODEOWNERS file exists)

- ✅ **Require status checks to pass before merging**
  - Require branches to be up to date before merging
  - Required status checks:
    - `backend-ci`
    - `frontend-ci` 
    - `integration-tests`
    - `security-audit`

- ✅ **Require conversation resolution before merging**

- ✅ **Restrict pushes that create files**
  - Only allow specific users/teams to push directly

#### Advanced Settings:
- ✅ **Do not allow bypassing the above settings**
- ✅ **Restrict force pushes**
- ✅ **Allow deletions** (unchecked for protection)

### 3. Branch Protection Configuration Example
```yaml
# .github/branch-protection.yml (for documentation)
main:
  protection:
    required_status_checks:
      strict: true
      contexts:
        - "backend-ci"
        - "frontend-ci"
        - "integration-tests"
        - "security-audit"
    enforce_admins: true
    required_pull_request_reviews:
      required_approving_review_count: 2
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    restrictions:
      users: []
      teams: ["maintainers"]
```

## Local Enforcement System

### Backend Implementation

The local enforcement system validates pull requests against branch protection rules before allowing merge operations.

#### Core Files:
- `backend/src/middleware/branchProtection.ts` - Protection middleware
- `backend/src/routes/branchProtection.ts` - API endpoints
- `backend/src/app.ts` - Route registration

#### Key Functions:

1. **Branch Protection Validation**
```typescript
validatePRRequirements(req, res, next)
```
- Checks if target branch is protected
- Validates approval requirements
- Ensures CI checks are passing
- Verifies conversation resolution
- Confirms branch is up-to-date

2. **Protection Status Check**
```typescript
getBranchProtectionStatus(pr, config)
```
- Returns comprehensive protection status
- Lists current violations
- Provides requirement details

3. **Bypass Mechanism**
```typescript
checkBypassPermission(req, res, next)
```
- Allows admin override (if enabled)
- Logs bypass actions for audit

### Configuration

#### Default Protection Config:
```typescript
const defaultConfig = {
  requiredApprovals: 2,
  requireUpToDate: true,
  requireConversationResolution: true,
  protectedBranches: ['main', 'master', 'develop', 'production']
};
```

#### Environment Variables:
```bash
# Optional - customize protection settings
BRANCH_PROTECTION_REQUIRED_APPROVALS=2
BRANCH_PROTECTION_ALLOW_FORCE_PUSH=false
BRANCH_PROTECTION_ADMIN_BYPASS=false
```

## Frontend Components

### 1. BranchProtectionStatus Component
Displays real-time protection status and requirements.

**Location:** `frontend/src/components/BranchProtectionStatus.tsx`

**Features:**
- ✅ Visual status indicators
- ✅ Requirement breakdowns
- ✅ Violation notifications
- ✅ Refresh functionality

### 2. EnhancedMergeButton Component
Intelligent merge button with protection awareness.

**Location:** `frontend/src/components/EnhancedMergeButton.tsx`

**Features:**
- ✅ Merge method selection
- ✅ Protection status awareness
- ✅ Force merge option (admin)
- ✅ Merge confirmation

### Integration Example:
```tsx
<BranchProtectionStatus
  pullRequestId={pullRequest._id}
  onStatusChange={(canMerge, isProtected) => {
    setCanMerge(canMerge);
    setIsProtected(isProtected);
  }}
/>

<EnhancedMergeButton
  pullRequestId={pullRequest._id}
  canMerge={canMerge}
  isProtected={isProtected}
  onMergeSuccess={() => handleMergeSuccess()}
  onMergeError={(error) => handleError(error)}
/>
```

## API Endpoints

### Branch Protection APIs

#### 1. Get Protection Status
```http
GET /api/pull-requests/:id/protection-status
```

**Response:**
```json
{
  "protected": true,
  "canMerge": false,
  "targetBranch": "main",
  "requirements": {
    "approvals": {
      "required": 2,
      "current": 1,
      "satisfied": false,
      "reviewers": ["user1"]
    },
    "ciChecks": {
      "required": ["ci", "tests", "security"],
      "passing": ["ci", "tests"],
      "satisfied": false
    },
    "conversations": {
      "unresolved": 0,
      "satisfied": true
    },
    "upToDate": {
      "satisfied": true
    }
  },
  "violations": [
    "Requires 2 approvals, has 1",
    "CI checks must pass before merging"
  ]
}
```

#### 2. Merge Pull Request
```http
POST /api/pull-requests/:id/merge
Content-Type: application/json

{
  "mergeMethod": "squash" // merge, squash, rebase
}
```

#### 3. Force Merge (Admin)
```http
POST /api/pull-requests/:id/force-merge
Content-Type: application/json

{
  "reason": "Emergency hotfix for production issue",
  "mergeMethod": "merge"
}
```

#### 4. Request Additional Reviews
```http
POST /api/pull-requests/:id/request-review
Content-Type: application/json

{
  "reviewerIds": ["user2", "user3"],
  "message": "Additional review required for branch protection compliance"
}
```

#### 5. Get Protection Configuration
```http
GET /api/branch-protection/config
```

## Team Workflow

### 1. Developer Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to origin
git push origin feature/new-feature

# 4. Create pull request (GitHub UI or CLI)
gh pr create --title "Add new feature" --body "Description"

# 5. Request reviewers
gh pr edit --add-reviewer @teammate1,@teammate2

# 6. Wait for approvals and CI checks
# 7. Merge via platform (automatic protection validation)
```

### 2. Reviewer Workflow
1. **Review Code Changes**
   - Examine diff and files changed
   - Test functionality locally if needed
   - Check for security vulnerabilities

2. **Provide Feedback**
   - Add line comments for specific issues
   - Request changes if needed
   - Approve when satisfied

3. **Final Approval**
   - Ensure all conversations resolved
   - Verify CI checks passing
   - Approve for merge

### 3. Merge Process
The platform automatically:
1. ✅ Validates branch protection requirements
2. ✅ Checks approval count and reviewers
3. ✅ Verifies CI status
4. ✅ Confirms branch is up-to-date
5. ✅ Allows merge if all conditions met
6. ❌ Blocks merge if any requirement fails

## Configuration Examples

### 1. Strict Protection (Production)
```typescript
const strictConfig = {
  requiredApprovals: 2,
  requireUpToDate: true,
  requireConversationResolution: true,
  protectedBranches: ['main', 'production'],
  allowForcePush: false,
  adminCanBypass: false,
  requiredStatusChecks: [
    'backend-ci', 'frontend-ci', 'integration-tests', 
    'security-audit', 'quality-gate'
  ]
};
```

### 2. Relaxed Protection (Development)
```typescript
const relaxedConfig = {
  requiredApprovals: 1,
  requireUpToDate: false,
  requireConversationResolution: false,
  protectedBranches: ['develop'],
  allowForcePush: false,
  adminCanBypass: true,
  requiredStatusChecks: ['ci']
};
```

## Troubleshooting

### Common Issues

#### 1. "Merge blocked by branch protection"
**Cause:** One or more protection requirements not met

**Solutions:**
- Request additional reviewers if approval count insufficient
- Wait for CI checks to complete and pass
- Resolve all conversation threads
- Update branch with latest changes from target branch

#### 2. "CI checks failing"
**Cause:** Build, test, or security issues

**Solutions:**
- Check CI logs in GitHub Actions tab
- Fix failing tests or linting issues
- Address security vulnerabilities
- Push fixes and wait for re-run

#### 3. "Branch behind target"
**Cause:** Target branch has newer commits

**Solutions:**
```bash
# Update your branch
git checkout feature/branch
git pull origin main
git push origin feature/branch
```

#### 4. Force Merge Not Available
**Cause:** Admin bypass disabled or insufficient permissions

**Solutions:**
- Enable admin bypass in configuration
- Contact repository administrator
- Satisfy protection requirements normally

### Debug Commands

#### Check Protection Status
```bash
# Via API
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/pull-requests/$PR_ID/protection-status"

# Via logs
grep "Branch protection" backend/logs/app.log
```

#### View Configuration
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:4000/api/branch-protection/config"
```

## Security Considerations

### 1. Access Control
- Limit force merge permissions to senior team members only
- Regularly audit bypass actions
- Use principle of least privilege

### 2. Audit Logging
All protection-related actions are logged:
```typescript
console.log(`Protection validation: PR ${id}`, {
  canMerge: boolean,
  violations: string[],
  user: string,
  timestamp: Date
});
```

### 3. Emergency Procedures
For critical production fixes:
1. Document emergency reason
2. Use force merge with detailed justification
3. Create follow-up PR for proper review
4. Review emergency process regularly

## Integration with CI/CD

Branch protection integrates seamlessly with the existing CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
- name: Set status check
  run: |
    # CI automatically reports status to GitHub
    # Platform reads these statuses for protection validation
```

The protection system automatically recognizes:
- ✅ Passing CI workflows as satisfied status checks
- ❌ Failed workflows as blocking conditions
- ⏳ Pending workflows as incomplete requirements

## Best Practices

### 1. Team Setup
- Start with relaxed rules and gradually strengthen
- Train team on new workflow before enforcement
- Establish clear escalation procedures

### 2. Configuration Management
- Store protection config in version control
- Use environment-specific settings
- Regular review and updates

### 3. Monitoring
- Set up alerts for protection bypasses
- Monitor merge patterns and compliance
- Regular team retrospectives on process

---

## Quick Reference

### Essential Commands
```bash
# Check PR protection status
curl -X GET /api/pull-requests/{id}/protection-status

# Merge PR (with validation)
curl -X POST /api/pull-requests/{id}/merge

# Force merge (emergency)
curl -X POST /api/pull-requests/{id}/force-merge \
  -d '{"reason": "Emergency fix"}'
```

### Protection Requirements Checklist
- [ ] Minimum approvals met
- [ ] CI checks passing
- [ ] Conversations resolved
- [ ] Branch up-to-date
- [ ] No outstanding change requests

This comprehensive system ensures code quality while maintaining development velocity through intelligent automation and clear communication of requirements.