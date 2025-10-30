import { Request, Response, NextFunction } from 'express';
import PullRequestModel from '../models/PullRequest';
import UserModel from '../models/User';
import BranchProtectionRule from '../models/BranchProtectionRule';

export interface BranchProtectionConfig {
  requiredApprovals: number;
  requiredReviewers?: string[];
  requireUpToDate: boolean;
  requireConversationResolution: boolean;
  allowedMergeUsers?: string[];
  protectedBranches: string[];
}

// Default branch protection configuration
const defaultConfig: BranchProtectionConfig = {
  requiredApprovals: 2,
  requireUpToDate: true,
  requireConversationResolution: true,
  protectedBranches: ['main', 'master', 'develop', 'production']
};

/**
 * Get branch protection rules from database
 */
export const getBranchProtectionRules = async (projectId: string = 'global') => {
  try {
    let rules = await BranchProtectionRule.findOne({ 
      projectId, 
      isActive: true 
    });
    
    // If no rules exist, create and return default ones
    if (!rules) {
      rules = new BranchProtectionRule({
        projectId,
        branchPattern: 'main',
        rules: {
          requirePullRequest: true,
          requireReviews: true,
          requiredReviewers: 2,
          dismissStaleReviews: true,
          requireCodeOwnerReviews: false,
          restrictPushes: true,
          allowForcePushes: false,
          allowDeletions: false,
          requiredStatusChecks: {
            strict: true,
            contexts: ['ci/tests', 'ci/build']
          },
          enforceAdmins: false,
          restrictReviewDismissals: false,
          blockCreations: false
        }
      });
      
      await rules.save();
    }
    
    return rules;
  } catch (error) {
    console.error('Error getting branch protection rules:', error);
    return null;
  }
};

export interface BranchProtectionStatus {
  canMerge: boolean;
  requirements: {
    approvals: {
      required: number;
      current: number;
      satisfied: boolean;
      reviewers: string[];
    };
    conversations: {
      unresolved: number;
      satisfied: boolean;
    };
    ciChecks: {
      required: string[];
      passing: string[];
      satisfied: boolean;
    };
    upToDate: {
      satisfied: boolean;
      behindBy?: number;
    };
  };
  violations: string[];
}

/**
 * Check if a branch is protected
 */
export const isProtectedBranch = (branchName: string, config = defaultConfig): boolean => {
  return config.protectedBranches.includes(branchName);
};

/**
 * Validate pull request against branch protection rules
 */
export const validatePRRequirements = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;  // Changed from pullRequestId to id to match the route
    const config = defaultConfig;

    const pr = await PullRequestModel.findById(id)
      .populate('author')
      .populate('assignedReviewers')
      .populate('reviewDecisions.reviewer');

    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    // Check if target branch is protected
    if (!isProtectedBranch(pr.targetBranch, config)) {
      return next(); // Not a protected branch, allow operation
    }

    // Get the project ID and use database rules
    const projectId = pr.repository?.toString() || 'default';
    const status = await getBranchProtectionStatus(pr, config, projectId);

    if (!status.canMerge) {
      return res.status(400).json({
        error: 'Branch protection rules violated',
        message: 'Cannot merge: branch protection requirements not met',
        violations: status.violations,
        requirements: status.requirements
      });
    }

    // Add protection status to request for logging
    (req as any).branchProtectionStatus = status;
    next();
  } catch (error) {
    console.error('Branch protection validation error:', error);
    res.status(500).json({ error: 'Failed to validate branch protection rules' });
  }
};

/**
 * Get comprehensive branch protection status
 */
export const getBranchProtectionStatus = async (
  pr: any,
  config = defaultConfig,
  projectId: string = 'global'
): Promise<BranchProtectionStatus> => {
  // Get rules from database
  const dbRules = await getBranchProtectionRules(projectId);
  const requiredApprovals = dbRules?.rules.requiredReviewers || config.requiredApprovals;
  const requiredChecks = dbRules?.rules.requiredStatusChecks.contexts || [];
  const requireConversationResolution = dbRules?.rules.dismissStaleReviews || config.requireConversationResolution;
  // Only require up-to-date if there are status checks AND strict is enabled
  // If no status checks are required, don't require up-to-date branch
  const requireUpToDate = requiredChecks.length > 0 ? (dbRules?.rules.requiredStatusChecks.strict || false) : false;
  
  const status: BranchProtectionStatus = {
    canMerge: false,
    requirements: {
      approvals: {
        required: requiredApprovals,
        current: 0,
        satisfied: false,
        reviewers: []
      },
      conversations: {
        unresolved: 0,
        satisfied: true
      },
      ciChecks: {
        required: requiredChecks,
        passing: [],
        satisfied: false
      },
      upToDate: {
        satisfied: true
      }
    },
    violations: []
  };

  // Check approvals
  const approvedReviews = pr.reviewDecisions?.filter(
    (decision: any) => decision.decision === 'approved'
  ) || [];
  
  status.requirements.approvals.current = approvedReviews.length;
  status.requirements.approvals.reviewers = approvedReviews.map(
    (review: any) => review.reviewer.username
  );
  status.requirements.approvals.satisfied = 
    status.requirements.approvals.current >= requiredApprovals;

  if (!status.requirements.approvals.satisfied) {
    status.violations.push(
      `Requires ${requiredApprovals} approvals, has ${status.requirements.approvals.current}`
    );
  }

  // Check for changes requested
  const changesRequested = pr.reviewDecisions?.some(
    (decision: any) => decision.decision === 'changes_requested'
  );

  if (changesRequested) {
    status.violations.push('Changes requested by reviewers must be addressed');
  }

  // Check conversations (mock implementation - would need actual comment resolution tracking)
  if (requireConversationResolution) {
    const unresolvedComments = pr.comments?.filter(
      (comment: any) => !comment.resolved
    ) || [];
    
    status.requirements.conversations.unresolved = unresolvedComments.length;
    status.requirements.conversations.satisfied = unresolvedComments.length === 0;

    if (!status.requirements.conversations.satisfied) {
      status.violations.push(
        `${status.requirements.conversations.unresolved} unresolved conversations`
      );
    }
  }

  // Check CI status (mock implementation - would integrate with actual CI system)
  const ciStatus = await checkCIStatus(pr, requiredChecks);
  status.requirements.ciChecks = ciStatus;

  if (!ciStatus.satisfied) {
    status.violations.push('CI checks must pass before merging');
  }

  // Check if branch is up to date (mock implementation)
  if (requireUpToDate) {
    const upToDateStatus = await checkBranchUpToDate(pr);
    status.requirements.upToDate = upToDateStatus;

    if (!upToDateStatus.satisfied) {
      status.violations.push('Branch must be up to date with target branch');
    }
  }

  // Determine overall merge eligibility
  status.canMerge = 
    status.requirements.approvals.satisfied &&
    status.requirements.conversations.satisfied &&
    status.requirements.ciChecks.satisfied &&
    status.requirements.upToDate.satisfied &&
    !changesRequested;

  return status;
};

/**
 * Mock CI status check - in production, this would integrate with GitHub Actions API
 */
const checkCIStatus = async (pr: any, requiredChecks: string[] = []) => {
  // Mock implementation - replace with actual GitHub API calls
  // If no required checks are configured, return satisfied
  if (requiredChecks.length === 0) {
    return {
      required: [],
      passing: [],
      satisfied: true
    };
  }
  
  // Mock CI results - simulate that all required checks are passing for demo
  // In production, this would query actual CI system (GitHub Actions, Jenkins, etc.)
  const passingChecks = requiredChecks; // Assume all required checks are passing for now
  const satisfied = true; // Always satisfied for demo purposes

  return {
    required: requiredChecks,
    passing: passingChecks,
    satisfied
  };
};

/**
 * Mock branch up-to-date check
 */
const checkBranchUpToDate = async (_pr: any) => {
  // Mock implementation - replace with actual Git API calls
  return {
    satisfied: Math.random() > 0.3, // 70% chance of being up to date
    behindBy: Math.random() > 0.3 ? 0 : Math.floor(Math.random() * 5) + 1
  };
};

/**
 * Middleware to check if user can bypass branch protection
 */
export const checkBypassPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = (req as any).user?.id;
    const user = await UserModel.findById(userId);

    // Only admins can bypass (simplified check - could add role field to User model)
    const canBypass = false; // For now, no one can bypass - could implement admin role later
    
    if (!canBypass) {
      return validatePRRequirements(req, res, next);
    }

    // Admin bypass - log for audit
    console.log(`Admin bypass: ${user?.username} bypassed branch protection for PR ${req.params.pullRequestId}`);
    next();
  } catch (error) {
    console.error('Bypass permission check error:', error);
    res.status(500).json({ error: 'Failed to check bypass permissions' });
  }
};